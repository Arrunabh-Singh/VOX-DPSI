import express from 'express'
import rateLimit from 'express-rate-limit'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'
import { formatComplaintNo } from '../utils/complaintNo.js'
import { detectUrgency, detectPoshPocso } from '../utils/keywords.js'
import { getSignedAttachmentUrl } from './upload.js'
import {
  notifyStatusChange,
  notifyAssignment,
  notifyComplaintCreated,
  notifyEscalation,
} from '../services/notifications.js'

const router = express.Router()

// Complaint creation: 10 per hour per IP
const complaintCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many complaints submitted. Please wait before submitting again.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Respondent types that bypass council and route directly to coordinator
const STAFF_RESPONDENT_TYPES = ['teaching_staff', 'non_teaching_staff', 'council_member', 'school_policy']

// Temporal correlation mitigation (#73) —————————————————————————————————————
// For anonymous complaints, jitter the stored created_at by ±15 minutes so
// a handler cannot cross-reference the submission time with school CCTV or
// sign-in logs to de-anonymise the student.
function jitteredTimestamp(isAnonymous) {
  if (!isAnonymous) return undefined // let Supabase default to now()
  const jitterMs = (Math.random() * 30 - 15) * 60 * 1000 // ±15 min in ms
  return new Date(Date.now() + jitterMs).toISOString()
}

// For display: anonymous complaints show date-only to non-student roles to
// prevent minute-level correlation even when the raw timestamp leaks via UI.
function maskTimestamp(isoString, isAnonymous, viewerRole) {
  if (!isoString) return isoString
  if (!isAnonymous) return isoString
  if (viewerRole === 'student') return isoString // student sees own complaint in full
  // Handlers see only the calendar date, e.g. "2026-05-04"
  return isoString.slice(0, 10)
}

// Helper: determine if student identity should be hidden for this role
const HIGH_AUTHORITY_ROLES = ['council_member', 'supervisor', 'principal', 'vice_principal', 'director', 'board_member']

function shouldHideStudentIdentity(complaint, requestingRole) {
  if (['student', ...HIGH_AUTHORITY_ROLES].includes(requestingRole)) {
    return false // these roles can always see or are handled separately
  }
  // For class_teacher and coordinator: check if identity was revealed in escalation
  if (complaint.is_anonymous_requested && !complaint.identity_revealed) {
    return true
  }
  return false
}

// POST /api/complaints — student raises a complaint
router.post('/', verifyToken, complaintCreateLimiter, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can raise complaints' })
    }
    const {
      domain,
      description,
      is_anonymous_requested,
      attachment_url,
      priority: requestedPriority,
      respondent_type,
    } = req.body

    if (!domain || !description) {
      return res.status(400).json({ error: 'domain and description are required' })
    }
    if (description.length < 50) {
      return res.status(400).json({ error: 'Description must be at least 50 characters' })
    }

    // ── #4 Duplicate Detection ────────────────────────────────────────────────
    // If the student has an open complaint in the same domain within the last 7
    // days, return a 409 with duplicate info. Client shows a warning; student
    // can pass force=true to submit anyway (e.g. teacher ignored their first one).
    const { force: forceSubmit = false } = req.body
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: existingComplaints } = await supabase
      .from('complaints')
      .select('id, complaint_no, status, created_at')
      .eq('student_id', req.user.id)
      .eq('domain', domain)
      .not('status', 'in', '("resolved","closed","withdrawn","archived")')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(3)

    if (existingComplaints && existingComplaints.length > 0 && !forceSubmit) {
      return res.status(409).json({
        error: 'Possible duplicate complaint',
        duplicate: true,
        existing: existingComplaints.map(c => ({
          id: c.id,
          complaint_no: formatComplaintNo(c.complaint_no),
          status: c.status,
          created_at: c.created_at,
        })),
        message: `You already have ${existingComplaints.length} open complaint${existingComplaints.length > 1 ? 's' : ''} in the "${domain}" category from the last 7 days. Submit anyway by passing force=true.`,
      })
    }

    // ── Keyword urgency detection ─────────────────────────────────────────────
    const detectedKeyword = detectUrgency(description)
    let priority = requestedPriority === 'urgent' ? 'urgent' : 'normal'
    let autoFlagged = false
    if (detectedKeyword && priority !== 'urgent') {
      priority = 'urgent'
      autoFlagged = true
    }

    // ── POSH / POCSO triage (Phase 1 — legal compliance) ──────────────────────
    // If the description contains POSH/POCSO keywords, the complaint MUST bypass
    // all student handlers and route directly to the coordinator + Internal Committee.
    // Council members are completely excluded from POSH/POCSO complaints.
    const poshCheck = detectPoshPocso(description)
    const isPoshPocso = !!poshCheck
    if (isPoshPocso) priority = 'urgent' // POSH/POCSO is always urgent

    // ── Respondent type routing ────────────────────────────────────────────────
    // Complaints about staff or school policy skip the council entirely.
    const resolvedRespondentType = respondent_type || 'student'
    const skipCouncil = isPoshPocso || STAFF_RESPONDENT_TYPES.includes(resolvedRespondentType)

    // ── Determine handler and status ──────────────────────────────────────────
    let assigned = null
    let currentHandlerRole = 'council_member'
    let initialStatus = 'raised'

    if (isPoshPocso) {
      // Mandatory IC routing: no council assignment, status signals IC referral
      currentHandlerRole = 'coordinator'
      initialStatus = 'requires_ic'
    } else if (skipCouncil) {
      // Staff complaint: route directly to coordinator, no council involvement
      currentHandlerRole = 'coordinator'
    } else {
      // Normal flow: round-robin assign to a council member
      const { data: councilMembers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'council_member')
      assigned = councilMembers && councilMembers.length > 0
        ? councilMembers[Math.floor(Math.random() * councilMembers.length)].id
        : null
    }

    // SLA: 48 h for normal, 7 calendar days (168 h) for POSH/POCSO (statutory deadline)
    const slaHours = isPoshPocso ? 168 : 48
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString()

    // Temporal jitter: anonymous complaints get a ±15 min offset on created_at
    // so handlers cannot triangulate the submitter from time-of-day logs (#73)
    const jitteredAt = jitteredTimestamp(!!is_anonymous_requested)

    const insertPayload = {
      student_id: req.user.id,
      domain,
      description,
      priority,
      is_anonymous_requested: !!is_anonymous_requested,
      attachment_url: attachment_url || null,
      assigned_council_member_id: assigned,
      status: initialStatus,
      current_handler_role: currentHandlerRole,
      identity_revealed: false,
      respondent_type: resolvedRespondentType,
      is_posh_pocso: isPoshPocso,
      // description_unlocked_for stays NULL until in-person verify (PII masking)
      description_unlocked_for: null,
      ...(jitteredAt ? { created_at: jitteredAt } : {}),
    }

    try { insertPayload.sla_deadline = slaDeadline } catch {}

    const { data: complaint, error } = await supabase
      .from('complaints')
      .insert(insertPayload)
      .select('*, complaint_no')
      .single()

    if (error) throw error

    // ── Timeline entries ───────────────────────────────────────────────────────
    const timelineEntries = [{
      complaint_id: complaint.id,
      action: 'Complaint raised',
      performed_by: req.user.id,
      performed_by_role: 'student',
      note: `Domain: ${domain}. Priority: ${priority}. Respondent type: ${resolvedRespondentType}.${is_anonymous_requested ? ' Anonymity requested.' : ''}`,
    }]

    if (autoFlagged) {
      timelineEntries.push({
        complaint_id: complaint.id,
        action: '⚡ Auto-flagged Urgent — sensitive keyword detected',
        performed_by: req.user.id,
        performed_by_role: 'system',
        note: `Keyword detected: "${detectedKeyword}". Complaint auto-upgraded to URGENT.`,
      })
    }

    if (isPoshPocso) {
      timelineEntries.push({
        complaint_id: complaint.id,
        action: `🔴 ${poshCheck.type} Protocol Activated — mandatory Internal Committee referral`,
        performed_by: null,
        performed_by_role: 'system',
        note: `Sensitive content detected (${poshCheck.type}). Complaint routed directly to Coordinator and Internal Committee. Council member assignment bypassed. Student identity protected. Statutory 7-day response deadline applies.`,
      })
    } else if (resolvedRespondentType === 'council_member') {
      // #74 — Specific entry for complaints about council members
      timelineEntries.push({
        complaint_id: complaint.id,
        action: `📛 Complaint about a council member — routed directly to coordinator`,
        performed_by: null,
        performed_by_role: 'system',
        note: `This complaint concerns a council member. To prevent a conflict of interest, it has been routed directly to the coordinator. No council member has been assigned or can view this complaint.`,
      })
    } else if (skipCouncil) {
      // Other staff/policy complaints
      timelineEntries.push({
        complaint_id: complaint.id,
        action: `📋 Staff/policy complaint — routed directly to coordinator`,
        performed_by: null,
        performed_by_role: 'system',
        note: `Respondent type "${resolvedRespondentType}" — council member bypass applied. Complaint assigned to coordinator for direct handling.`,
      })
    }

    await supabase.from('complaint_timeline').insert(timelineEntries)

    // ── Notifications ──────────────────────────────────────────────────────────
    if (assigned) {
      notifyAssignment(assigned, formatComplaintNo(complaint.complaint_no), domain, complaint.id)
    }

    if (isPoshPocso) {
      // Alert coordinator and principal immediately for POSH/POCSO
      const { data: seniorStaff } = await supabase
        .from('users')
        .select('id')
        .in('role', ['coordinator', 'principal'])
      if (seniorStaff) {
        seniorStaff.forEach(s => {
          notifyEscalation(s.id, formatComplaintNo(complaint.complaint_no), 'Internal Committee', complaint.id)
        })
      }
    }

    notifyComplaintCreated(req.user.id, formatComplaintNo(complaint.complaint_no), domain, complaint.id)

    res.status(201).json({
      ...complaint,
      complaint_no_display: formatComplaintNo(complaint.complaint_no),
      auto_flagged: autoFlagged,
      detected_keyword: detectedKeyword,
      posh_pocso_type: poshCheck ? poshCheck.type : null,
      routed_to: currentHandlerRole,
    })
  } catch (err) {
    console.error('Raise complaint error:', err)
    res.status(500).json({ error: 'Failed to raise complaint' })
  }
})

// GET /api/complaints — role-filtered list
router.get('/', verifyToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user
    let query = supabase.from('complaints').select(`
      *,
      student:student_id (id, name, scholar_no, section, house),
      council_member:assigned_council_member_id (id, name),
      supervisor:supervisor_id (id, name)
    `).order('created_at', { ascending: false })

    if (role === 'student') {
      query = query.eq('student_id', userId)
    } else if (role === 'guardian') {
      // #63 — Guardian sees complaints linked to their children via vpc_parent_email
      const { data: children } = await supabase
        .from('users')
        .select('id')
        .eq('vpc_parent_email', req.user.email)
      const childIds = (children || []).map(c => c.id)
      query = query.in('student_id', childIds)
    } else if (role === 'council_member') {
      // #20 — Also include complaints delegated to this council member today
      const today = new Date().toISOString().slice(0, 10)
      const { data: activeDelegations } = await supabase
        .from('delegation_rules')
        .select('delegator_id')
        .eq('delegate_id', userId)
        .lte('start_date', today)
        .gte('end_date', today)
      const delegatorIds = (activeDelegations || []).map(d => d.delegator_id)
      const assigneeIds = [userId, ...delegatorIds]
      query = query.in('assigned_council_member_id', assigneeIds)
    } else if (role === 'class_teacher') {
      // Show all complaints currently at teacher level; filtered by section if teacher has one
      query = query.eq('current_handler_role', 'class_teacher')
      // Note: section-based filtering is handled client-side after fetching student info
    } else if (role === 'coordinator') {
      // Show complaints at coordinator level, plus ones they escalated to principal
      query = query.in('current_handler_role', ['coordinator', 'principal'])
    }
    // principal, vice_principal, supervisor, director, board_member see all

    // Hidden (gibberish-flagged) complaints are invisible to everyone except
    // supervisor/principal/director/board_member who can see them in a dedicated view
    if (!['supervisor', 'principal', 'vice_principal', 'director', 'board_member'].includes(role)) {
      query = query.neq('is_hidden', true)
    }

    const { data: complaints, error } = await query
    if (error) throw error

    const formatted = (complaints || []).map(c => {
      const result = {
        ...c,
        complaint_no_display: formatComplaintNo(c.complaint_no),
        // Temporal correlation mitigation: date-only for anon complaints visible to handlers
        created_at: maskTimestamp(c.created_at, c.is_anonymous_requested, role),
        updated_at: maskTimestamp(c.updated_at, c.is_anonymous_requested, role),
      }

      // ── PII masking for council members ────────────────────────────────────
      // Council members only see the full description after they have done the
      // in-person verification. Until then, show a truncated preview.
      if (role === 'council_member') {
        const unlocked = c.description_unlocked_for === userId
        if (!unlocked && c.description) {
          result.description = c.description.slice(0, 60) + (c.description.length > 60 ? '… [Full details visible after in-person verification]' : '')
          result.description_masked = true
        } else {
          result.description_masked = false
        }
      }

      // Anonymity: hide student info from teacher/coordinator if not revealed
      // principal, vice_principal, director, board_member always see full identity
      if (['class_teacher', 'coordinator'].includes(role) && c.is_anonymous_requested && !c.identity_revealed) {
        result.student = { id: null, name: 'Anonymous Student', scholar_no: null, section: null }
      }
      return result
    })

    res.json(formatted)
  } catch (err) {
    console.error('Get complaints error:', err)
    res.status(500).json({ error: 'Failed to fetch complaints' })
  }
})

// GET /api/complaints/:id — detail view
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const { role, id: userId } = req.user

    const { data: complaint, error } = await supabase
      .from('complaints')
      .select(`
        *,
        student:student_id (id, name, scholar_no, section, house),
        council_member:assigned_council_member_id (id, name),
        supervisor:supervisor_id (id, name)
      `)
      .eq('id', id)
      .single()

    if (error || !complaint) return res.status(404).json({ error: 'Complaint not found' })

    // Access control
    if (role === 'student' && complaint.student_id !== userId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    if (role === 'guardian') {
      const { data: child } = await supabase
        .from('users')
        .select('id')
        .eq('id', complaint.student_id)
        .eq('vpc_parent_email', req.user.email)
        .maybeSingle()
      if (!child) return res.status(403).json({ error: 'Access denied' })
    }
    if (role === 'council_member' && complaint.assigned_council_member_id !== userId) {
      // #20 — allow delegate access
      const today = new Date().toISOString().slice(0, 10)
      const { data: delegation } = await supabase
        .from('delegation_rules')
        .select('id')
        .eq('delegate_id', userId)
        .eq('delegator_id', complaint.assigned_council_member_id)
        .lte('start_date', today)
        .gte('end_date', today)
        .limit(1)
        .maybeSingle()
      if (!delegation) return res.status(403).json({ error: 'Access denied' })
    }

    const result = {
      ...complaint,
      complaint_no_display: formatComplaintNo(complaint.complaint_no),
      // Temporal correlation mitigation: date-only timestamps for anon complaints
      created_at: maskTimestamp(complaint.created_at, complaint.is_anonymous_requested, role),
      updated_at: maskTimestamp(complaint.updated_at, complaint.is_anonymous_requested, role),
    }

    // Resolve current handler name for display
    const handlerRoleMap = {
      council_member: 'council_member',
      class_teacher: 'class_teacher',
      coordinator: 'coordinator',
      principal: 'principal',
      supervisor: 'supervisor',
    }
    if (complaint.current_handler_role && complaint.current_handler_role !== 'council_member') {
      const { data: handlerUser } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('role', complaint.current_handler_role)
        .limit(1)
        .single()
      if (handlerUser) result.current_handler = handlerUser
    } else if (complaint.assigned_council_member_id) {
      result.current_handler = complaint.council_member
    }

    // ── PII masking for council members (detail view) ──────────────────────────
    if (role === 'council_member') {
      const unlocked = complaint.description_unlocked_for === userId
      if (!unlocked && result.description) {
        result.description = result.description.slice(0, 60) + (result.description.length > 60 ? '… [Full details visible after in-person verification]' : '')
        result.description_masked = true
      } else {
        result.description_masked = false
      }
    }

    // Apply anonymity for teacher/coordinator (principal and vice_principal always see full identity)
    if (["class_teacher", "coordinator"].includes(role) && complaint.is_anonymous_requested && !complaint.identity_revealed) {
      result.student = { id: null, name: "Anonymous Student", scholar_no: null, section: null, house: null }
    }

    // ── Signed URL refresh for attachment (#55) ────────────────────────────────
    // The DB stores the raw storage path. Generate a fresh 1-hour signed URL so
    // the client always gets a working link regardless of when it was uploaded.
    if (result.attachment_url) {
      const fresh = await getSignedAttachmentUrl(result.attachment_url)
      if (fresh) result.attachment_url = fresh
    }

    // ── Passive access log ─────────────────────────────────────────────────────
    // Log every detail-view access for audit trail (fire-and-forget, non-blocking)
    supabase.from('complaint_access_log').insert({
      complaint_id: id,
      accessed_by: userId,
      accessed_by_role: role,
      is_assigned_handler: role === 'council_member'
        ? complaint.assigned_council_member_id === userId
        : ['coordinator', 'class_teacher', 'principal'].includes(role),
    }).catch(() => {}) // silently ignore log failures — never block the response

    res.json(result)
  } catch (err) {
    console.error('Get complaint error:', err)
    res.status(500).json({ error: 'Failed to fetch complaint' })
  }
})

// PATCH /api/complaints/:id/verify — mark verified in person
router.patch('/:id/verify', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'council_member') {
      return res.status(403).json({ error: 'Only council members can verify' })
    }
    const { id } = req.params
    const { note } = req.body

    const slaDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('complaints')
      .update({
        status: 'verified',
        updated_at: new Date().toISOString(),
        sla_deadline: slaDeadline,
        // PII masking: unlock full description for this specific council member
        description_unlocked_for: req.user.id,
      })
      .eq('id', id)
      .eq('assigned_council_member_id', req.user.id)
      .select()
      .single()

    if (error || !data) return res.status(404).json({ error: 'Complaint not found or not assigned to you' })

    await supabase.from('complaint_timeline').insert({
      complaint_id: id,
      action: 'Verified in person',
      performed_by: req.user.id,
      performed_by_role: 'council_member',
      note: note || 'Council member verified the complaint in person.',
    })

    // Notify student
    notifyStatusChange(data.student_id, formatComplaintNo(data.complaint_no), 'raised', 'verified', id)

    res.json({ ...data, complaint_no_display: formatComplaintNo(data.complaint_no) })
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' })
  }
})

// PATCH /api/complaints/:id/status — update status (in_progress)
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const { status, note } = req.body
    const { role, id: userId } = req.user

    const allowedStatuses = {
      council_member: ['in_progress'],
      class_teacher: ['in_progress'],
      coordinator: ['in_progress'],
      principal: ['in_progress', 'closed'],
    }

    if (!allowedStatuses[role] || !allowedStatuses[role].includes(status)) {
      return res.status(403).json({ error: 'Status transition not allowed for your role' })
    }

    const { data, error } = await supabase
      .from('complaints')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error || !data) return res.status(404).json({ error: 'Complaint not found' })

    await supabase.from('complaint_timeline').insert({
      complaint_id: id,
      action: `Status updated to: ${status.replace(/_/g, ' ')}`,
      performed_by: userId,
      performed_by_role: role,
      note: note || null,
    })

    // Notify student of the status change
    notifyStatusChange(data.student_id, formatComplaintNo(data.complaint_no), 'previous', status, id)

    res.json({ ...data, complaint_no_display: formatComplaintNo(data.complaint_no) })
  } catch (err) {
    res.status(500).json({ error: 'Status update failed' })
  }
})

// PATCH /api/complaints/:id/resolve — mark resolved
router.patch('/:id/resolve', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const { note } = req.body
    const { role, id: userId } = req.user

    const allowedRoles = ['council_member', 'class_teacher', 'coordinator', 'principal', 'vice_principal', 'director', 'board_member']
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Not allowed' })
    }

    // Anti-powerplay: check if resolved suspiciously fast (< 30 minutes from raise)
    const { data: existing } = await supabase
      .from('complaints')
      .select('created_at, status, student_id, complaint_no')
      .eq('id', id)
      .single()

    const minutesSinceRaise = existing
      ? (Date.now() - new Date(existing.created_at).getTime()) / 60000
      : null

    const { data, error } = await supabase
      .from('complaints')
      .update({ status: 'resolved', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error || !data) return res.status(404).json({ error: 'Complaint not found' })

    const timelineEntries = [{
      complaint_id: id,
      action: 'Complaint resolved',
      performed_by: userId,
      performed_by_role: role,
      note: note || 'Issue resolved.',
    }]

    // Flag if resolved extremely quickly — adds a transparent audit entry
    if (minutesSinceRaise !== null && minutesSinceRaise < 30 && role === 'council_member') {
      timelineEntries.push({
        complaint_id: id,
        action: '⚠️ System: Quick-close flag',
        performed_by: null,
        performed_by_role: 'system',
        note: `Complaint marked resolved within ${Math.round(minutesSinceRaise)} minutes of being raised. This entry is logged for transparency.`,
      })
    }

    await supabase.from('complaint_timeline').insert(timelineEntries)

    // Notify student of resolution
    notifyStatusChange(data.student_id, formatComplaintNo(data.complaint_no), data.status, 'resolved', id)

    res.json({ ...data, complaint_no_display: formatComplaintNo(data.complaint_no) })
  } catch (err) {
    res.status(500).json({ error: 'Resolve failed' })
  }
})

// PATCH /api/complaints/:id/escalate — escalate to next level
router.patch('/:id/escalate', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const { escalate_to, reveal_identity, reason } = req.body
    const { role, id: userId } = req.user

    const escalationMap = {
      council_member: ['escalated_to_teacher', 'escalated_to_coordinator'],
      class_teacher: ['escalated_to_coordinator'],
      coordinator: ['escalated_to_principal'],
    }

    if (!escalationMap[role] || !escalationMap[role].includes(escalate_to)) {
      return res.status(403).json({ error: 'Invalid escalation target for your role' })
    }

    const handlerRoleMap = {
      escalated_to_teacher: 'class_teacher',
      escalated_to_coordinator: 'coordinator',
      escalated_to_principal: 'principal',
    }

    const updatePayload = {
      status: escalate_to,
      current_handler_role: handlerRoleMap[escalate_to],
      updated_at: new Date().toISOString(),
    }

    // Principal always gets full identity; otherwise respect the reveal decision
    if (reveal_identity || escalate_to === 'escalated_to_principal') {
      updatePayload.identity_revealed = true
    }

    const { data, error } = await supabase
      .from('complaints')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) return res.status(404).json({ error: 'Complaint not found' })

    // ── #30 DPDP Act 2023 — Consent Logging for Identity Reveal ──────────────
    // Three possible consent decisions:
    //   'revealed_by_handler'  — handler explicitly chose to reveal
    //   'kept_anonymous'       — handler chose to protect identity
    //   'system_required'      — principal escalation mandates reveal (no choice)
    const consentDecision =
      escalate_to === 'escalated_to_principal' ? 'system_required'
      : reveal_identity ? 'revealed_by_handler'
      : 'kept_anonymous'

    // Fetch the student's original anonymity request for full audit context
    const { data: complaintForAudit } = await supabase
      .from('complaints')
      .select('is_anonymous_requested, student_id')
      .eq('id', id)
      .single()
    const anonRequested = complaintForAudit?.is_anonymous_requested ?? false

    // Log to escalations table with consent_decision for DPDP audit
    await supabase.from('escalations').insert({
      complaint_id: id,
      escalated_by: userId,
      escalated_to_role: handlerRoleMap[escalate_to],
      student_consent: !!reveal_identity,  // legacy boolean kept for query compat
      reason: reason || null,
    })

    // Build a clear, audit-grade timeline note
    let identityNote
    if (consentDecision === 'system_required') {
      identityNote = '🔐 Identity Reveal: REQUIRED — escalation to Principal mandates full visibility. Student identity visible to Principal. [DPDP Act 2023 — Section 9 audit record]'
    } else if (consentDecision === 'revealed_by_handler') {
      identityNote = anonRequested
        ? `🔐 Identity Reveal: YES — This student requested anonymity, but the handler chose to reveal their identity to the next handler (${handlerRoleMap[escalate_to].replace(/_/g, ' ')}). [DPDP Act 2023 consent decision recorded]`
        : `🔐 Identity Reveal: YES — Student identity passed to ${handlerRoleMap[escalate_to].replace(/_/g, ' ')}. [DPDP Act 2023 audit record]`
    } else {
      identityNote = anonRequested
        ? `🔐 Identity Reveal: NO — Student requested anonymity; handler preserved it. Next handler (${handlerRoleMap[escalate_to].replace(/_/g, ' ')}) will not see student name or scholar number. [DPDP Act 2023 — anonymity protected]`
        : `🔐 Identity Reveal: NO — Student identity not passed to ${handlerRoleMap[escalate_to].replace(/_/g, ' ')}. [DPDP Act 2023 audit record]`
    }

    await supabase.from('complaint_timeline').insert({
      complaint_id: id,
      action: `🚀 Escalated to ${handlerRoleMap[escalate_to].replace(/_/g, ' ')}`,
      performed_by: userId,
      performed_by_role: role,
      note: `${reason ? 'Reason: ' + reason + '\n' : ''}${identityNote}`,
    })

    // Notify student of escalation
    notifyStatusChange(data.student_id, formatComplaintNo(data.complaint_no), data.status, escalate_to, id)

    // Notify all handlers of the target role (in-app + WhatsApp)
    const targetRole = handlerRoleMap[escalate_to]
    supabase.from('users').select('id').eq('role', targetRole).then(({ data: handlers }) => {
      if (handlers && handlers.length > 0) {
        handlers.forEach(h => {
          notifyEscalation(h.id, formatComplaintNo(data.complaint_no), targetRole, id)
        })
      }
    })

    res.json({ ...data, complaint_no_display: formatComplaintNo(data.complaint_no) })
  } catch (err) {
    console.error('Escalate error:', err)
    res.status(500).json({ error: 'Escalation failed' })
  }
})

// PATCH /api/complaints/:id/withdraw — student withdraws their own complaint
router.patch('/:id/withdraw', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can withdraw their complaints' })
    }
    const { id } = req.params
    const { reason } = req.body

    const { data: complaint } = await supabase
      .from('complaints')
      .select('student_id, status, complaint_no')
      .eq('id', id)
      .single()

    if (!complaint || complaint.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' })
    }
    if (!['raised', 'verified'].includes(complaint.status)) {
      return res.status(400).json({ error: 'Complaint can only be withdrawn before it is escalated' })
    }

    const { data, error } = await supabase
      .from('complaints')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await supabase.from('complaint_timeline').insert({
      complaint_id: id,
      action: '↩️ Complaint withdrawn by student',
      performed_by: req.user.id,
      performed_by_role: 'student',
      note: reason ? reason.trim() : 'Student chose to withdraw this complaint.',
    })

    res.json({ ...data, complaint_no_display: formatComplaintNo(data.complaint_no) })
  } catch (err) {
    console.error('Withdraw error:', err)
    res.status(500).json({ error: 'Failed to withdraw complaint' })
  }
})

// PATCH /api/complaints/:id/close — student confirms resolution and closes the complaint
router.patch('/:id/close', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can close their own complaints' })
    }
    const { id } = req.params
    const { note } = req.body

    const { data: complaint, error: fetchErr } = await supabase
      .from('complaints')
      .select('id, student_id, status, complaint_no')
      .eq('id', id)
      .single()

    if (fetchErr || !complaint) return res.status(404).json({ error: 'Complaint not found' })
    if (complaint.student_id !== req.user.id) return res.status(403).json({ error: 'Access denied' })
    if (complaint.status !== 'resolved') {
      return res.status(400).json({ error: 'Can only close resolved complaints' })
    }

    const { data, error } = await supabase
      .from('complaints')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await supabase.from('complaint_timeline').insert({
      complaint_id: id,
      action: '✅ Complaint closed by student',
      performed_by: req.user.id,
      performed_by_role: 'student',
      note: note || 'Student confirmed resolution and closed the complaint.',
    })

    res.json({ ...data, complaint_no_display: formatComplaintNo(data.complaint_no) })
  } catch (err) {
    console.error('Close error:', err)
    res.status(500).json({ error: 'Failed to close complaint' })
  }
})

// PATCH /api/complaints/:id/reopen — student reopens within 7 days of resolution (#3)
router.patch('/:id/reopen', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can reopen their own complaints' })
    }
    const { id } = req.params
    const { reason } = req.body

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide a reason (at least 10 characters) for reopening' })
    }

    const { data: complaint, error: fetchErr } = await supabase
      .from('complaints')
      .select('id, student_id, status, updated_at, complaint_no, current_handler_role, assigned_council_member_id')
      .eq('id', id)
      .single()

    if (fetchErr || !complaint) return res.status(404).json({ error: 'Complaint not found' })
    if (complaint.student_id !== req.user.id) return res.status(403).json({ error: 'Access denied' })

    const REOPENABLE_STATUSES = ['resolved', 'closed']
    if (!REOPENABLE_STATUSES.includes(complaint.status)) {
      return res.status(400).json({ error: 'Only resolved or closed complaints can be reopened' })
    }

    // 7-day window from the last updated_at (i.e. when it was resolved/closed)
    const daysSinceResolution = (Date.now() - new Date(complaint.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceResolution > 7) {
      return res.status(400).json({ error: 'Reopening window has passed. Complaints can only be reopened within 7 days of resolution.' })
    }

    // Restore to in_progress; keep the same handler role and council member
    const { data, error } = await supabase
      .from('complaints')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await supabase.from('complaint_timeline').insert({
      complaint_id: id,
      action: '🔄 Complaint reopened by student',
      performed_by: req.user.id,
      performed_by_role: 'student',
      note: reason.trim(),
    })

    // Notify the current handler that the complaint has been reopened
    if (complaint.assigned_council_member_id) {
      notifyStatusChange(
        complaint.assigned_council_member_id,
        formatComplaintNo(data.complaint_no),
        complaint.status,
        'in_progress',
        id
      )
    }

    res.json({ ...data, complaint_no_display: formatComplaintNo(data.complaint_no) })
  } catch (err) {
    console.error('Reopen error:', err)
    res.status(500).json({ error: 'Failed to reopen complaint' })
  }
})

// PATCH /api/complaints/:id/feedback — student submits feedback after resolution
router.patch('/:id/feedback', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can submit feedback' })
    }
    const { id } = req.params
    const { rating, note } = req.body
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5' })
    }
    const { data: complaint } = await supabase
      .from('complaints')
      .select('student_id, status, feedback_rating')
      .eq('id', id)
      .single()

    if (!complaint || complaint.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' })
    }
    if (complaint.status !== 'resolved') {
      return res.status(400).json({ error: 'Can only rate resolved complaints' })
    }
    if (complaint.feedback_rating) {
      return res.status(400).json({ error: 'Feedback already submitted' })
    }

    const { data, error } = await supabase
      .from('complaints')
      .update({ feedback_rating: rating, feedback_note: note || null, feedback_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit feedback' })
  }
})

// POST /api/complaints/:id/appeal — student files an appeal
router.post('/:id/appeal', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can file appeals' })
    }
    const { id } = req.params
    const { reason } = req.body
    if (!reason || reason.length < 50) {
      return res.status(400).json({ error: 'Appeal reason must be at least 50 characters' })
    }

    const { data: complaint } = await supabase
      .from('complaints')
      .select('student_id, status')
      .eq('id', id)
      .single()

    if (!complaint || complaint.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' })
    }
    if (complaint.status !== 'resolved') {
      return res.status(400).json({ error: 'Can only appeal resolved complaints' })
    }

    // Create appeal
    const { data: appeal, error } = await supabase
      .from('appeals')
      .insert({ complaint_id: id, filed_by: req.user.id, reason, status: 'pending' })
      .select()
      .single()

    if (error) throw error

    // Update complaint status to appealed
    await supabase.from('complaints')
      .update({ status: 'appealed', updated_at: new Date().toISOString() })
      .eq('id', id)

    await supabase.from('complaint_timeline').insert({
      complaint_id: id,
      action: '📋 Appeal filed by student',
      performed_by: req.user.id,
      performed_by_role: 'student',
      note: reason,
    })

    res.status(201).json(appeal)
  } catch (err) {
    console.error('Appeal error:', err)
    res.status(500).json({ error: 'Failed to file appeal' })
  }
})

// GET /api/appeals/all — supervisor/principal/coordinator see all appeals
router.get('/appeals/all', verifyToken, async (req, res) => {
  try {
    const { role } = req.user
    if (!['supervisor', 'principal', 'coordinator'].includes(role)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const { data, error } = await supabase
      .from('appeals')
      .select(`
        *,
        complaint:complaint_id(complaint_no, domain, status, description, assigned_council_member_id),
        filed_by_user:filed_by(name, scholar_no)
      `)
      .order('created_at', { ascending: false })
    if (error) throw error
    // Attach display complaint number
    const result = (data || []).map(a => ({
      ...a,
      complaint: a.complaint ? {
        ...a.complaint,
        complaint_no_display: a.complaint.complaint_no ? `VOX-${String(a.complaint.complaint_no).padStart(3, '0')}` : null
      } : null
    }))
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appeals' })
  }
})

// GET /api/appeals/my — council member sees appeals on their assigned complaints
router.get('/appeals/my', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'council_member') {
      return res.status(403).json({ error: 'Access denied' })
    }
    // Find all complaints assigned to this council member that have an appeal
    const { data: complaints } = await supabase
      .from('complaints')
      .select('id')
      .eq('assigned_council_member_id', req.user.id)

    if (!complaints || complaints.length === 0) return res.json([])

    const ids = complaints.map(c => c.id)
    const { data, error } = await supabase
      .from('appeals')
      .select(`
        *,
        complaint:complaint_id(complaint_no, domain, status, description),
        filed_by_user:filed_by(name, scholar_no)
      `)
      .in('complaint_id', ids)
      .order('created_at', { ascending: false })

    if (error) throw error
    const result = (data || []).map(a => ({
      ...a,
      complaint: a.complaint ? {
        ...a.complaint,
        complaint_no_display: a.complaint.complaint_no ? `VOX-${String(a.complaint.complaint_no).padStart(3, '0')}` : null
      } : null
    }))
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your appeals' })
  }
})

// PATCH /api/appeals/:appealId/vote — council_member or supervisor casts their vote
// Body: { vote: 'uphold'|'reject', note: string, voter_label?: string (for VOX-O6 member name) }
router.patch('/appeals/:appealId/vote', verifyToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user
    if (!['council_member', 'supervisor', 'principal'].includes(role)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const { appealId } = req.params
    const { vote, note, voter_label } = req.body
    if (!['uphold', 'reject'].includes(vote)) {
      return res.status(400).json({ error: 'Vote must be uphold or reject' })
    }
    if (!note || note.trim().length < 5) {
      return res.status(400).json({ error: 'A note is required with your vote' })
    }

    // Fetch the current appeal
    const { data: appeal, error: fetchErr } = await supabase
      .from('appeals')
      .select('*')
      .eq('id', appealId)
      .single()

    if (fetchErr || !appeal) return res.status(404).json({ error: 'Appeal not found' })
    if (!['pending', 'voting'].includes(appeal.status)) {
      return res.status(400).json({ error: 'This appeal has already been decided' })
    }

    // Determine which voter role this is
    const isCouncil    = role === 'council_member'
    const isSupervisor = ['supervisor', 'principal'].includes(role)

    // Guard against double-voting
    if (isCouncil && appeal.council_vote != null) {
      return res.status(400).json({ error: 'Council member has already voted on this appeal' })
    }
    if (isSupervisor && appeal.supervisor_vote != null) {
      return res.status(400).json({ error: 'VOX-O6 has already voted on this appeal' })
    }

    // Build the update payload (no updated_at — column doesn't exist on appeals table)
    const updatePayload = { status: 'voting' }
    if (isCouncil) {
      updatePayload.council_vote       = vote
      updatePayload.council_vote_note  = note.trim()
      updatePayload.council_voter_id   = userId
    } else {
      updatePayload.supervisor_vote       = vote
      updatePayload.supervisor_vote_note  = note.trim()
      updatePayload.supervisor_voter_id   = userId
      if (voter_label) updatePayload.supervisor_voter_label = voter_label
    }

    // Determine updated votes after this submission
    const newCouncilVote    = isCouncil    ? vote : appeal.council_vote
    const newSupervisorVote = isSupervisor ? vote : appeal.supervisor_vote

    // If both have now voted → decide outcome
    let finalDecision = null
    if (newCouncilVote != null && newSupervisorVote != null) {
      // Both agree → unanimous outcome
      if (newCouncilVote === newSupervisorVote) {
        finalDecision = newCouncilVote === 'uphold' ? 'upheld' : 'rejected'
      } else {
        // Split vote → supervisor (VOX-O6 / senior authority) wins
        finalDecision = newSupervisorVote === 'uphold' ? 'upheld' : 'rejected'
      }
      updatePayload.status       = finalDecision
      updatePayload.resolved_at  = new Date().toISOString()
    }

    const { data: updated, error: updateErr } = await supabase
      .from('appeals')
      .update(updatePayload)
      .eq('id', appealId)
      .select()
      .single()

    if (updateErr) throw updateErr

    // Add timeline entry for this vote
    const voterLabel = isCouncil
      ? 'Council Member'
      : (voter_label || 'VOX-O6 Supervisor')

    await supabase.from('complaint_timeline').insert({
      complaint_id: appeal.complaint_id,
      action: `📋 ${voterLabel} voted to ${vote === 'uphold' ? 'Uphold' : 'Reject'} the appeal`,
      performed_by: userId,
      performed_by_role: role,
      note: note.trim(),
    })

    // If appeal is now decided → update the complaint
    if (finalDecision) {
      const voteBreakdown = newCouncilVote === newSupervisorVote
        ? 'Unanimous decision'
        : 'Split vote — VOX-O6 decision prevails'

      if (finalDecision === 'upheld') {
        await supabase.from('complaints')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', appeal.complaint_id)

        await supabase.from('complaint_timeline').insert({
          complaint_id: appeal.complaint_id,
          action: `📋 Appeal UPHELD — complaint reopened (${voteBreakdown})`,
          performed_by: null,
          performed_by_role: 'system',
          note: `Council voted: ${newCouncilVote ?? 'pending'} | VOX-O6 voted: ${newSupervisorVote ?? 'pending'}`,
        })
      } else {
        await supabase.from('complaints')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', appeal.complaint_id)

        await supabase.from('complaint_timeline').insert({
          complaint_id: appeal.complaint_id,
          action: `📋 Appeal REJECTED — resolution stands (${voteBreakdown})`,
          performed_by: null,
          performed_by_role: 'system',
          note: `Council voted: ${newCouncilVote ?? 'pending'} | VOX-O6 voted: ${newSupervisorVote ?? 'pending'}`,
        })
      }
    }

    res.json(updated)
  } catch (err) {
    console.error('Vote error:', err)
    res.status(500).json({ error: 'Failed to cast vote' })
  }
})

// PATCH /api/complaints/:id/assign — assign to council member
// #1 Collision Detection: if a complaint is already assigned, require force=true
// to prevent two coordinators simultaneously assigning to different people.
router.patch('/:id/assign', verifyToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user
    if (!['coordinator', 'principal'].includes(role)) {
      return res.status(403).json({ error: 'Not allowed' })
    }
    const { id } = req.params
    const { council_member_id, force = false } = req.body

    // ── Collision guard: read current assignment first ────────────────────
    const { data: current, error: fetchErr } = await supabase
      .from('complaints')
      .select('assigned_council_member_id, council_member:assigned_council_member_id(name), complaint_no, status')
      .eq('id', id)
      .single()

    if (fetchErr || !current) return res.status(404).json({ error: 'Complaint not found' })

    if (current.assigned_council_member_id && current.assigned_council_member_id !== council_member_id && !force) {
      // Return a 409 with enough info for the frontend to show a confirmation prompt
      return res.status(409).json({
        error: 'Complaint already assigned',
        conflict: true,
        current_assignee: current.council_member?.name || 'another council member',
        current_assignee_id: current.assigned_council_member_id,
        message: `This complaint is already assigned to ${current.council_member?.name || 'another council member'}. Pass force=true to override.`,
      })
    }

    const { data, error } = await supabase
      .from('complaints')
      .update({
        assigned_council_member_id: council_member_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Log the assignment (including re-assignments for audit trail)
    const wasReassignment = !!current.assigned_council_member_id &&
      current.assigned_council_member_id !== council_member_id
    await supabase.from('complaint_timeline').insert({
      complaint_id: id,
      action: wasReassignment
        ? `♻️ Complaint re-assigned by ${role.replace(/_/g, ' ')}`
        : `👤 Complaint assigned by ${role.replace(/_/g, ' ')}`,
      performed_by: userId,
      performed_by_role: role,
      note: wasReassignment
        ? `Reassigned from previous council member (collision override). Assigned to new handler.`
        : null,
    }).catch(() => {}) // non-blocking

    // Notify new assignee
    if (council_member_id) {
      notifyAssignment(council_member_id, formatComplaintNo(data.complaint_no), data.domain, id)
    }

    res.json({ ...data, complaint_no_display: formatComplaintNo(data.complaint_no) })
  } catch (err) {
    console.error('Assignment error:', err)
    res.status(500).json({ error: 'Assignment failed' })
  }
})

// GET /api/complaints/:id/viewers — active viewers in the last 5 min (#1 presence)
// Used by client to display "X is also viewing this" collision warning
router.get('/:id/viewers', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const { id: userId, role } = req.user

    // Only handlers (not students) need to see this
    if (role === 'student') return res.json({ viewers: [] })

    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString() // last 5 min

    const { data: logs } = await supabase
      .from('complaint_access_log')
      .select('accessed_by, accessed_by_role, created_at, user:accessed_by(name)')
      .eq('complaint_id', id)
      .gte('created_at', since)
      .neq('accessed_by', userId)  // exclude self
      .order('created_at', { ascending: false })

    // Deduplicate — one entry per unique viewer, most recent access kept
    const seen = new Set()
    const viewers = (logs || []).filter(l => {
      if (seen.has(l.accessed_by)) return false
      seen.add(l.accessed_by)
      return true
    }).map(l => ({
      id: l.accessed_by,
      name: l.user?.name || 'Unknown',
      role: l.accessed_by_role,
      last_seen: l.created_at,
    }))

    res.json({ viewers })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch viewers' })
  }
})

// POST /api/complaints/:id/deletion-request — council member requests deletion
router.post('/:id/deletion-request', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'council_member') {
      return res.status(403).json({ error: 'Only council members can request deletion' })
    }
    const { id } = req.params
    const { reason } = req.body
    if (!reason || reason.trim().length < 20) {
      return res.status(400).json({ error: 'Reason must be at least 20 characters' })
    }

    // Check complaint is assigned to this council member
    const { data: complaint } = await supabase
      .from('complaints')
      .select('id, assigned_council_member_id, status, complaint_no')
      .eq('id', id)
      .single()

    if (!complaint || complaint.assigned_council_member_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied — not assigned to you' })
    }
    if (['resolved','closed'].includes(complaint.status)) {
      return res.status(400).json({ error: 'Cannot request deletion of resolved/closed complaints' })
    }

    // Check no pending request already exists
    const { data: existing } = await supabase
      .from('complaint_deletions')
      .select('id')
      .eq('complaint_id', id)
      .eq('status', 'pending')
      .single()

    if (existing) {
      return res.status(400).json({ error: 'A deletion request is already pending for this complaint' })
    }

    const { data: delRequest, error } = await supabase
      .from('complaint_deletions')
      .insert({
        complaint_id: id,
        requested_by: req.user.id,
        reason: reason.trim(),
        council_approved: true,
        superior_approved: false,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    await supabase.from('complaint_timeline').insert({
      complaint_id: id,
      action: '🗑️ Deletion requested by council member',
      performed_by: req.user.id,
      performed_by_role: 'council_member',
      note: `Reason: ${reason.trim()}. Awaiting supervisor approval.`,
    })

    res.status(201).json(delRequest)
  } catch (err) {
    console.error('Deletion request error:', err)
    res.status(500).json({ error: 'Failed to create deletion request' })
  }
})

// GET /api/complaints/deletion-requests — supervisor views all pending deletion requests
router.get('/deletion-requests/all', verifyToken, async (req, res) => {
  try {
    if (!['supervisor', 'principal'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const { data, error } = await supabase
      .from('complaint_deletions')
      .select(`
        *,
        complaint:complaint_id(complaint_no, domain, description, status),
        requested_by_user:requested_by(id, name, role)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json((data || []).map(d => ({
      ...d,
      complaint: d.complaint ? {
        ...d.complaint,
        complaint_no_display: formatComplaintNo(d.complaint.complaint_no),
      } : null,
    })))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deletion requests' })
  }
})

// PATCH /api/complaints/deletion-requests/:reqId/review — supervisor approves or rejects
router.patch('/deletion-requests/:reqId/review', verifyToken, async (req, res) => {
  try {
    if (!['supervisor', 'principal'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const { reqId } = req.params
    const { decision, note } = req.body // decision: 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be approved or rejected' })
    }

    const { data: delReq, error: fetchErr } = await supabase
      .from('complaint_deletions')
      .select('*')
      .eq('id', reqId)
      .eq('status', 'pending')
      .single()

    if (fetchErr || !delReq) return res.status(404).json({ error: 'Deletion request not found or already reviewed' })

    const { data: updated, error } = await supabase
      .from('complaint_deletions')
      .update({
        status: decision,
        superior_approved: decision === 'approved',
        superior_id: req.user.id,
        superior_note: note || null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reqId)
      .select()
      .single()

    if (error) throw error

    if (decision === 'approved') {
      // Soft-hide: mark as hidden instead of deleting from DB
      // The complaint remains in the database for audit purposes but disappears
      // from all normal views. Only supervisor/principal can see hidden complaints.
      await supabase.from('complaints')
        .update({ is_hidden: true, status: 'closed' })
        .eq('id', delReq.complaint_id)
      await supabase.from('complaint_timeline').insert({
        complaint_id: delReq.complaint_id,
        action: '🚫 Complaint hidden — identified as gibberish/invalid',
        performed_by: req.user.id,
        performed_by_role: req.user.role,
        note: note || 'Supervisor approved. Complaint flagged and hidden from all views. Record retained for audit.',
      })
    } else {
      await supabase.from('complaint_timeline').insert({
        complaint_id: delReq.complaint_id,
        action: '🗑️ Deletion request rejected by supervisor',
        performed_by: req.user.id,
        performed_by_role: req.user.role,
        note: note || 'Supervisor reviewed and rejected the deletion request.',
      })
    }

    res.json(updated)
  } catch (err) {
    console.error('Deletion review error:', err)
    res.status(500).json({ error: 'Failed to review deletion request' })
  }
})

// POST /api/complaints/:id/enquiry — principal/director/board adds formal enquiry note
router.post('/:id/enquiry', verifyToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user
    const allowedRoles = ['principal', 'director', 'board_member', 'coordinator', 'vice_principal']
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Only principal-level roles can add formal enquiry notes' })
    }
    const { id } = req.params
    const { findings, assigned_to } = req.body // assigned_to: optional staff user id
    if (!findings || findings.trim().length < 10) {
      return res.status(400).json({ error: 'Findings must be at least 10 characters' })
    }

    const timelineEntries = [{
      complaint_id: id,
      action: `📋 Formal Enquiry Note by ${role.replace(/_/g, ' ')}`,
      performed_by: userId,
      performed_by_role: role,
      note: findings.trim(),
    }]

    // If assigning to a staff member, log that too
    if (assigned_to) {
      const { data: staffUser } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', assigned_to)
        .single()
      if (staffUser) {
        timelineEntries.push({
          complaint_id: id,
          action: `📌 Investigation assigned to ${staffUser.name}`,
          performed_by: userId,
          performed_by_role: role,
          note: `${staffUser.name} (${staffUser.role.replace(/_/g, ' ')}) has been assigned to investigate this complaint.`,
        })
      }
    }

    await supabase.from('complaint_timeline').insert(timelineEntries)

    res.json({ success: true })
  } catch (err) {
    console.error('Enquiry note error:', err)
    res.status(500).json({ error: 'Failed to add enquiry note' })
  }
})

// GET /api/complaints/export/csv — CSV export for principal/supervisor (#33)
// PII masking: student name + scholar_no are redacted for coordinator/supervisor exports.
// Only principal, vice_principal, director, board_member see unmasked identity.
// Anonymous-requested complaints are always masked regardless of exporter role.
// ?masked=true forces masking even for full-access roles (e.g. for publishing stats).
router.get('/export/csv', verifyToken, async (req, res) => {
  try {
    const { role } = req.user
    const ALLOWED_ROLES = ['principal', 'vice_principal', 'director', 'board_member', 'supervisor', 'coordinator']
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Roles that can see real student names in the export
    const FULL_PII_ROLES = ['principal', 'vice_principal', 'director', 'board_member']
    const showPii = FULL_PII_ROLES.includes(role) && req.query.masked !== 'true'

    const { data: complaints, error } = await supabase
      .from('complaints')
      .select('*, student:student_id(name, scholar_no, section), council_member:assigned_council_member_id(name)')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Helper: escape a cell value for CSV
    const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`

    const headers = [
      'Complaint No', 'Domain', 'Priority', 'Status',
      'Student Name', 'Scholar No', 'Section',
      'Anonymous Requested', 'Council Member',
      'Date Raised', 'Last Updated',
      'Respondent Type', 'Description',
    ]

    const rows = (complaints || []).map(c => {
      const anonReq = !!c.is_anonymous_requested
      // Mask if: exporter can't see PII, OR student requested anonymity and identity was not revealed
      const maskIdentity = !showPii || (anonReq && !c.identity_revealed)

      return [
        formatComplaintNo(c.complaint_no),
        c.domain,
        c.priority || 'normal',
        c.status,
        maskIdentity ? 'REDACTED' : (c.student?.name || ''),
        maskIdentity ? 'REDACTED' : (c.student?.scholar_no || ''),
        c.student?.section || '', // section is not PII — kept for statistics
        anonReq ? 'Yes' : 'No',
        c.council_member?.name || '',
        new Date(c.created_at).toLocaleDateString('en-IN'),
        new Date(c.updated_at).toLocaleDateString('en-IN'),
        c.respondent_type || '',
        cell(c.description),
      ].map((v, i) => i === 12 ? v : cell(v))
    })

    // Add export metadata header block
    const exportedBy = showPii ? role : `${role} (PII masked)`
    const metaLine = `# Vox DPSI Export — ${new Date().toLocaleString('en-IN')} — Exported by: ${exportedBy}`

    const csv = [metaLine, headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const filename = `vox-dpsi-export-${new Date().toISOString().slice(0, 10)}.csv`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send('﻿' + csv) // BOM for correct Excel UTF-8 rendering
  } catch (err) {
    console.error('CSV export error:', err)
    res.status(500).json({ error: 'Export failed' })
  }
})

// POST /api/complaints/:id/feedback — CSAT rating from student after resolution (#10)
router.post('/:id/feedback', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can submit feedback' })
    }
    const { id } = req.params
    const { rating, comment } = req.body

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    }

    // Verify the complaint belongs to this student and is resolved/closed
    const { data: complaint, error: cErr } = await supabase
      .from('complaints')
      .select('id, student_id, status')
      .eq('id', id)
      .single()

    if (cErr || !complaint) return res.status(404).json({ error: 'Complaint not found' })
    if (complaint.student_id !== req.user.id) return res.status(403).json({ error: 'Access denied' })
    if (!['resolved', 'closed'].includes(complaint.status)) {
      return res.status(400).json({ error: 'Feedback can only be submitted for resolved or closed complaints' })
    }

    // Upsert — allow resubmission with updated rating
    const { data, error } = await supabase
      .from('complaint_feedback')
      .upsert({
        complaint_id: id,
        student_id: req.user.id,
        rating: parseInt(rating, 10),
        comment: comment?.slice(0, 500) || null,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'complaint_id' })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    console.error('Feedback error:', err)
    res.status(500).json({ error: 'Failed to submit feedback' })
  }
})

// GET /api/complaints/:id/feedback — retrieve existing feedback for this complaint
router.get('/:id/feedback', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase
      .from('complaint_feedback')
      .select('*')
      .eq('complaint_id', id)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
    res.json(data || null)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback' })
  }
})

// ── POST /api/complaints/bulk — bulk status update / bulk assign (#6) ─────────
// Coordinator + Principal only. Accepts an array of complaint IDs and either
// a target status or a council member ID to assign to.
//
// Body: { ids: string[], action: 'status' | 'assign', value: string }
//   action = 'status' → value = new status string
//   action = 'assign' → value = council_member_id UUID

const BULK_ALLOWED_ROLES = ['coordinator','principal','supervisor','vice_principal','director']

router.post('/bulk', verifyToken, async (req, res) => {
  try {
    if (!BULK_ALLOWED_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bulk actions require coordinator or principal role' })
    }

    const { ids, action, value } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' })
    }
    if (ids.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 complaints per bulk action' })
    }
    if (!action || !value) {
      return res.status(400).json({ error: 'action and value are required' })
    }

    const VALID_STATUSES = ['verified','in_progress','escalated_to_coordinator','escalated_to_principal','resolved','closed']
    if (action === 'status' && !VALID_STATUSES.includes(value)) {
      return res.status(400).json({ error: `Invalid status: ${value}` })
    }

    // Build update payload
    const updatePayload = { updated_at: new Date().toISOString() }
    if (action === 'status') {
      updatePayload.status = value
      if (value === 'escalated_to_coordinator') updatePayload.current_handler_role = 'coordinator'
      if (value === 'escalated_to_principal')   updatePayload.current_handler_role = 'principal'
      if (value === 'resolved' || value === 'closed') {
        updatePayload.resolved_at = new Date().toISOString()
      }
    } else if (action === 'assign') {
      updatePayload.assigned_council_member_id = value
      updatePayload.current_handler_role = 'council_member'
    } else {
      return res.status(400).json({ error: 'action must be "status" or "assign"' })
    }

    // Fetch affected complaints (for notifications)
    const { data: complaints, error: fetchErr } = await supabase
      .from('complaints')
      .select('id, complaint_no, status, student_id')
      .in('id', ids)

    if (fetchErr) throw fetchErr

    // Bulk update
    const { error: updateErr } = await supabase
      .from('complaints')
      .update(updatePayload)
      .in('id', ids)

    if (updateErr) throw updateErr

    // Timeline entries (non-blocking)
    const performerRole = req.user.role
    const actionLabel = action === 'status'
      ? `Bulk status update → ${value}`
      : `Bulk assigned to council member`

    const timelineRows = ids.map(cid => ({
      complaint_id: cid,
      action: `📋 ${actionLabel} (by ${performerRole})`,
      performed_by: req.user.id,
      performed_by_role: performerRole,
      note: `Applied via bulk action to ${ids.length} complaint(s).`,
    }))

    supabase.from('complaint_timeline')
      .insert(timelineRows)
      .then(() => {})
      .catch(e => console.warn('[Bulk] Timeline insert failed:', e.message))

    // Notify students on status change (non-blocking)
    if (action === 'status' && complaints) {
      for (const c of complaints) {
        notifyStatusChange(
          c.student_id,
          formatComplaintNo(c.complaint_no),
          c.status,
          value,
          c.id
        ).catch(() => {})
      }
    }

    console.log(`[Bulk] ${req.user.role} ${req.user.id} applied ${action}=${value} to ${ids.length} complaints`)
    res.json({ updated: ids.length, action, value })
  } catch (err) {
    console.error('[Bulk] Error:', err)
    res.status(500).json({ error: 'Bulk action failed: ' + err.message })
  }
})

// ── #7 Complaint Merging ────────────────────────────────────────────────────
// POST /api/complaints/:id/merge
// Merges the source complaint (id) INTO the target complaint (body.target_id).
// Source is marked merged; its timeline events are copied to target.
// Roles: coordinator, principal, supervisor, vice_principal, director, board_member
const MERGE_ALLOWED = ['coordinator','principal','supervisor','vice_principal','director','board_member']

router.post('/:id/merge', verifyToken, async (req, res) => {
  try {
    if (!MERGE_ALLOWED.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorised to merge complaints' })
    }

    const sourceId = req.params.id
    const { target_id, reason } = req.body

    if (!target_id) return res.status(400).json({ error: 'target_id is required' })
    if (sourceId === target_id) return res.status(400).json({ error: 'Cannot merge a complaint into itself' })

    // Fetch both complaints
    const { data: source, error: srcErr } = await supabase
      .from('complaints')
      .select('id, complaint_no, status, merged_into_id, student_id, domain')
      .eq('id', sourceId)
      .single()
    if (srcErr || !source) return res.status(404).json({ error: 'Source complaint not found' })
    if (source.status === 'merged') return res.status(409).json({ error: 'This complaint is already merged' })

    const { data: target, error: tgtErr } = await supabase
      .from('complaints')
      .select('id, complaint_no, status')
      .eq('id', target_id)
      .single()
    if (tgtErr || !target) return res.status(404).json({ error: 'Target complaint not found' })
    if (target.status === 'merged') return res.status(409).json({ error: 'Cannot merge into an already-merged complaint' })

    const srcNo  = formatComplaintNo(source.complaint_no)
    const tgtNo  = formatComplaintNo(target.complaint_no)
    const actor  = req.user.id
    const role   = req.user.role
    const now    = new Date().toISOString()

    // 1. Mark source as merged
    await supabase
      .from('complaints')
      .update({ status: 'merged', merged_into_id: target_id, updated_at: now })
      .eq('id', sourceId)

    // 2. Copy source timeline events to target (with a note prefix)
    const { data: srcTimeline } = await supabase
      .from('complaint_timeline')
      .select('*')
      .eq('complaint_id', sourceId)
      .order('created_at', { ascending: true })

    if (srcTimeline && srcTimeline.length > 0) {
      const copied = srcTimeline.map(ev => ({
        complaint_id:    target_id,
        action:          `[Merged from ${srcNo}] ${ev.action}`,
        performed_by:    ev.performed_by,
        performed_by_role: ev.performed_by_role,
        note:            ev.note,
        created_at:      ev.created_at,
      }))
      await supabase.from('complaint_timeline').insert(copied)
    }

    // 3. Add merge event to target timeline
    await supabase.from('complaint_timeline').insert({
      complaint_id:    target_id,
      action:          `${srcNo} merged into this complaint`,
      performed_by:    actor,
      performed_by_role: role,
      note:            reason || null,
    })

    // 4. Add merge event to source timeline
    await supabase.from('complaint_timeline').insert({
      complaint_id:    sourceId,
      action:          `Merged into ${tgtNo}`,
      performed_by:    actor,
      performed_by_role: role,
      note:            reason || null,
    })

    console.log(`[Merge] ${role} ${actor} merged ${srcNo} → ${tgtNo}`)
    res.json({ ok: true, source_no: srcNo, target_no: tgtNo, target_id })
  } catch (err) {
    console.error('[Merge] Error:', err)
    res.status(500).json({ error: 'Merge failed: ' + err.message })
  }
})

// GET /api/complaints/:id/merge-candidates
// Returns open complaints that can be merged with this one (same domain, not already merged, not student's own)
router.get('/:id/merge-candidates', verifyToken, async (req, res) => {
  try {
    if (!MERGE_ALLOWED.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorised' })
    }
    const { id } = req.params
    const { q } = req.query  // optional complaint number search

    const { data: source } = await supabase
      .from('complaints')
      .select('id, domain')
      .eq('id', id)
      .single()
    if (!source) return res.status(404).json({ error: 'Complaint not found' })

    let query = supabase
      .from('complaints')
      .select('id, complaint_no, domain, status, description, created_at, student:users!complaints_student_id_fkey(name, section)')
      .eq('domain', source.domain)
      .neq('id', id)
      .not('status', 'in', '("merged","resolved","closed","archived")')
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: candidates, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    // If search query, filter by complaint number prefix client-side (small result set)
    const filtered = q
      ? (candidates || []).filter(c => formatComplaintNo(c.complaint_no).toLowerCase().includes(q.toLowerCase()))
      : (candidates || [])

    res.json(filtered.map(c => ({
      id: c.id,
      complaint_no: formatComplaintNo(c.complaint_no),
      domain: c.domain,
      status: c.status,
      description: c.description?.slice(0, 120),
      created_at: c.created_at,
      student_name: c.student?.name,
      student_section: c.student?.section,
    })))
  } catch (err) {
    console.error('[Merge Candidates] Error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── CONSENSUS VOTING (Task #21) ───────────────────────────────────────────────

const SENSITIVE_DOMAINS  = ['behaviour', 'personal']
const CONSENSUS_QUORUM   = 2   // minimum votes required to resolve

// POST /api/complaints/:id/request-consensus
// Council member (handler) submits a sensitive complaint for peer consensus.
// Creates the first "approve" vote from the requester.
router.post('/:id/request-consensus', verifyToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user
    if (role !== 'council_member') {
      return res.status(403).json({ error: 'Only council members can request consensus' })
    }
    const { id } = req.params
    const { resolution_note } = req.body

    const { data: complaint, error: fetchErr } = await supabase
      .from('complaints')
      .select('id, domain, status, assigned_council_member_id, consensus_status, complaint_no')
      .eq('id', id)
      .single()

    if (fetchErr || !complaint) return res.status(404).json({ error: 'Complaint not found' })
    if (complaint.assigned_council_member_id !== userId) {
      return res.status(403).json({ error: 'Only the assigned council member can request consensus' })
    }
    if (!SENSITIVE_DOMAINS.includes(complaint.domain)) {
      return res.status(400).json({ error: 'Consensus is only required for behaviour and personal domain complaints' })
    }
    if (complaint.consensus_status === 'voting') {
      return res.status(409).json({ error: 'Consensus voting is already in progress' })
    }
    if (['resolved', 'closed'].includes(complaint.status)) {
      return res.status(400).json({ error: 'Complaint is already resolved' })
    }

    // Mark complaint as voting + store the proposed resolution note
    const { error: updateErr } = await supabase
      .from('complaints')
      .update({
        consensus_required:       true,
        consensus_status:         'voting',
        consensus_requested_by:   userId,
        consensus_requested_at:   new Date().toISOString(),
        consensus_resolution_note: resolution_note || null,
        updated_at:               new Date().toISOString(),
      })
      .eq('id', id)

    if (updateErr) throw updateErr

    // Cast the requester's own "approve" vote
    await supabase.from('complaint_votes').upsert({
      complaint_id: id,
      voter_id:     userId,
      vote:         'approve',
      note:         'Requested by assigned council member',
    }, { onConflict: 'complaint_id,voter_id' })

    // Timeline entry
    await supabase.from('complaint_timeline').insert({
      complaint_id:      id,
      action:            '🗳️ Resolution submitted for peer consensus',
      performed_by:      userId,
      performed_by_role: 'council_member',
      note:              `Council member submitted proposed resolution for peer approval (${SENSITIVE_DOMAINS.includes(complaint.domain) ? complaint.domain : ''} domain). ${CONSENSUS_QUORUM} votes required.`,
    })

    res.json({ message: 'Consensus voting started' })
  } catch (err) {
    console.error('Request consensus error:', err)
    res.status(500).json({ error: 'Failed to start consensus' })
  }
})

// GET /api/complaints/consensus-pending
// Returns complaints currently in 'voting' consensus state that a council member hasn't voted on yet.
router.get('/consensus-pending', verifyToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user
    if (!['council_member', 'supervisor', 'principal', 'coordinator', 'vice_principal'].includes(role)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Get all complaints with consensus_status = 'voting'
    const { data: complaints, error } = await supabase
      .from('complaints')
      .select(`
        id, complaint_no, domain, status, consensus_status, consensus_resolution_note,
        consensus_requested_at,
        student:student_id (id, scholar_no, section),
        requested_by:consensus_requested_by (id, name),
        assigned_council_member:assigned_council_member_id (id, name)
      `)
      .eq('consensus_status', 'voting')
      .order('consensus_requested_at', { ascending: true })

    if (error) throw error

    // For each complaint, attach the current vote tally + whether I've voted
    const withVotes = await Promise.all((complaints || []).map(async (c) => {
      const { data: votes } = await supabase
        .from('complaint_votes')
        .select('voter_id, vote, note, created_at, voter:voter_id(name, role)')
        .eq('complaint_id', c.id)

      const myVote      = (votes || []).find(v => v.voter_id === userId)
      const approveCount = (votes || []).filter(v => v.vote === 'approve').length
      const rejectCount  = (votes || []).filter(v => v.vote === 'reject').length

      return {
        ...c,
        complaint_no_display: formatComplaintNo(c.complaint_no),
        votes:         votes || [],
        my_vote:       myVote?.vote || null,
        approve_count: approveCount,
        reject_count:  rejectCount,
        quorum:        CONSENSUS_QUORUM,
        quorum_met:    approveCount >= CONSENSUS_QUORUM,
      }
    }))

    res.json(withVotes)
  } catch (err) {
    console.error('Consensus pending error:', err)
    res.status(500).json({ error: 'Failed to fetch pending consensus' })
  }
})

// POST /api/complaints/:id/consensus-vote
// Cast or change a vote on a pending consensus complaint.
router.post('/:id/consensus-vote', verifyToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user
    if (!['council_member', 'supervisor'].includes(role)) {
      return res.status(403).json({ error: 'Only council members can vote on consensus' })
    }
    const { id }   = req.params
    const { vote, note } = req.body

    if (!['approve', 'reject'].includes(vote)) {
      return res.status(400).json({ error: 'vote must be "approve" or "reject"' })
    }

    // Fetch complaint
    const { data: complaint, error: fetchErr } = await supabase
      .from('complaints')
      .select('id, complaint_no, domain, status, consensus_status, consensus_resolution_note, assigned_council_member_id')
      .eq('id', id)
      .single()

    if (fetchErr || !complaint) return res.status(404).json({ error: 'Complaint not found' })
    if (complaint.consensus_status !== 'voting') {
      return res.status(400).json({ error: 'This complaint is not currently in consensus voting' })
    }

    // Upsert vote (allow changing mind until quorum)
    const { error: voteErr } = await supabase
      .from('complaint_votes')
      .upsert({
        complaint_id: id,
        voter_id:     userId,
        vote,
        note:         note || null,
      }, { onConflict: 'complaint_id,voter_id' })

    if (voteErr) throw voteErr

    // Fetch updated tally
    const { data: allVotes } = await supabase
      .from('complaint_votes')
      .select('voter_id, vote')
      .eq('complaint_id', id)

    const approveCount = (allVotes || []).filter(v => v.vote === 'approve').length
    const rejectCount  = (allVotes || []).filter(v => v.vote === 'reject').length
    const totalVotes   = (allVotes || []).length

    // Timeline for this vote
    await supabase.from('complaint_timeline').insert({
      complaint_id:      id,
      action:            `🗳️ Consensus vote: ${vote === 'approve' ? '✅ Approve' : '❌ Reject'}`,
      performed_by:      userId,
      performed_by_role: role,
      note:              note || `Voted to ${vote} the proposed resolution. Current tally: ${approveCount} approve / ${rejectCount} reject (${CONSENSUS_QUORUM} needed).`,
    })

    // Check for quorum resolution
    if (approveCount >= CONSENSUS_QUORUM) {
      // Auto-resolve the complaint
      await supabase.from('complaints').update({
        status:          'resolved',
        consensus_status: 'approved',
        updated_at:      new Date().toISOString(),
      }).eq('id', id)

      await supabase.from('complaint_timeline').insert({
        complaint_id:      id,
        action:            `✅ Complaint resolved by consensus (${approveCount}/${totalVotes} approved)`,
        performed_by:      null,
        performed_by_role: 'system',
        note:              complaint.consensus_resolution_note
          ? `Resolution: ${complaint.consensus_resolution_note}`
          : `Consensus quorum reached. Resolved automatically.`,
      })

      return res.json({
        message: `Quorum reached (${approveCount}/${CONSENSUS_QUORUM}) — complaint resolved`,
        resolved: true,
        approve_count: approveCount,
        reject_count:  rejectCount,
      })
    }

    // If majority reject (impossible to reach quorum), cancel consensus
    if (rejectCount >= CONSENSUS_QUORUM) {
      await supabase.from('complaints').update({
        consensus_status: 'rejected',
        updated_at:       new Date().toISOString(),
      }).eq('id', id)

      await supabase.from('complaint_timeline').insert({
        complaint_id:      id,
        action:            `❌ Consensus rejected — resolution not approved by peers`,
        performed_by:      null,
        performed_by_role: 'system',
        note:              `${rejectCount} council members voted to reject. Complaint returns to in_progress.`,
      })

      return res.json({
        message: 'Consensus rejected — complaint returned to in_progress',
        rejected: true,
        approve_count: approveCount,
        reject_count:  rejectCount,
      })
    }

    res.json({
      message: `Vote recorded. ${approveCount} approve, ${rejectCount} reject (${CONSENSUS_QUORUM} needed to resolve).`,
      approve_count: approveCount,
      reject_count:  rejectCount,
      quorum:        CONSENSUS_QUORUM,
    })
  } catch (err) {
    console.error('Consensus vote error:', err)
    res.status(500).json({ error: 'Failed to record vote' })
  }
})

// POST /api/complaints/:id/auto-assign — round-robin assign to next council member (#40)
router.post('/:id/auto-assign', verifyToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user
    if (!['coordinator', 'principal'].includes(role)) {
      return res.status(403).json({ error: 'Not allowed' })
    }

    const { id } = req.params

    // Verify complaint exists
    const { data: complaint, error: complaintErr } = await supabase
      .from('complaints')
      .select('id, complaint_no, domain')
      .eq('id', id)
      .single()
    if (complaintErr || !complaint) {
      return res.status(404).json({ error: 'Complaint not found' })
    }

    // Fetch all council members ordered deterministically
    const { data: members, error: membersErr } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'council_member')
      .order('created_at', { ascending: true })
    if (membersErr) throw membersErr
    if (!members || members.length === 0) {
      return res.status(400).json({ error: 'No council members available for auto-assignment' })
    }

    // Read current round-robin index from system_config
    const { data: configRows, error: configErr } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'round_robin_index')
      .limit(1)
    if (configErr) throw configErr

    const rawIndex       = Number.parseInt(configRows?.[0]?.value ?? '0', 10)
    const safeIndex      = Number.isFinite(rawIndex) && rawIndex >= 0 ? rawIndex : 0
    const assignedMember = members[safeIndex % members.length]
    const nextIndex      = safeIndex + 1
    const now            = new Date().toISOString()

    // Assign the complaint
    const { data: updated, error: updateErr } = await supabase
      .from('complaints')
      .update({
        assigned_council_member_id: assignedMember.id,
        current_handler_role:       'council_member',
        updated_at:                 now,
      })
      .eq('id', id)
      .select('id, complaint_no, domain, assigned_council_member_id')
      .single()
    if (updateErr) throw updateErr

    // Persist incremented index (upsert is safe for first-run)
    const { error: configSaveErr } = await supabase
      .from('system_config')
      .upsert(
        { key: 'round_robin_index', value: String(nextIndex), updated_at: now },
        { onConflict: 'key' }
      )
    if (configSaveErr) throw configSaveErr

    // Audit trail — timeline entry
    await supabase.from('complaint_timeline').insert({
      complaint_id:      id,
      action:            `🔁 Auto-assigned to ${assignedMember.name}`,
      performed_by:      userId,
      performed_by_role: role,
      note:              `Round-robin index ${safeIndex} → selected ${assignedMember.name}. Next index: ${nextIndex}.`,
    })

    // In-app + email notification to the assigned member
    notifyAssignment(
      assignedMember.id,
      formatComplaintNo(updated.complaint_no),
      updated.domain,
      id
    )

    res.json({
      message:              'Complaint auto-assigned via round-robin',
      complaint_id:         id,
      complaint_no_display: formatComplaintNo(updated.complaint_no),
      assigned_member: {
        id:   assignedMember.id,
        name: assignedMember.name,
      },
    })
  } catch (err) {
    console.error('Auto-assignment error:', err)
    res.status(500).json({ error: 'Auto-assignment failed' })
  }
})

export default router
