import express from 'express'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'
import { formatComplaintNo } from '../utils/complaintNo.js'
import { detectUrgency } from '../utils/keywords.js'
import {
  notifyStatusChange,
  notifyAssignment,
  notifyComplaintCreated,
  notifyEscalation,
} from '../services/notifications.js'

const router = express.Router()

// Helper: determine if student identity should be hidden for this role
function shouldHideStudentIdentity(complaint, requestingRole) {
  if (['student', 'council_member', 'supervisor', 'principal', 'vice_principal'].includes(requestingRole)) {
    return false // these roles can always see or are handled separately
  }
  // For class_teacher and coordinator: check if identity was revealed in escalation
  if (complaint.is_anonymous_requested && !complaint.identity_revealed) {
    return true
  }
  return false
}

// POST /api/complaints — student raises a complaint
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can raise complaints' })
    }
    const { domain, description, is_anonymous_requested, attachment_url, priority: requestedPriority } = req.body
    if (!domain || !description) {
      return res.status(400).json({ error: 'domain and description are required' })
    }
    if (description.length < 50) {
      return res.status(400).json({ error: 'Description must be at least 50 characters' })
    }

    // Keyword urgency detection
    const detectedKeyword = detectUrgency(description)
    let priority = requestedPriority === 'urgent' ? 'urgent' : 'normal'
    let autoFlagged = false
    if (detectedKeyword && priority !== 'urgent') {
      priority = 'urgent'
      autoFlagged = true
    }

    // SLA deadline: 48 hours from now
    const slaDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    // Find an available council member to assign
    const { data: councilMembers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'council_member')

    const assigned = councilMembers && councilMembers.length > 0
      ? councilMembers[Math.floor(Math.random() * councilMembers.length)].id
      : null

    const insertPayload = {
      student_id: req.user.id,
      domain,
      description,
      priority,
      is_anonymous_requested: !!is_anonymous_requested,
      attachment_url: attachment_url || null,
      assigned_council_member_id: assigned,
      status: 'raised',
      current_handler_role: 'council_member',
      identity_revealed: false,
    }

    // Add sla_deadline if column exists (graceful degradation)
    try { insertPayload.sla_deadline = slaDeadline } catch {}

    const { data: complaint, error } = await supabase
      .from('complaints')
      .insert(insertPayload)
      .select('*, complaint_no')
      .single()

    if (error) throw error

    // Timeline entries
    const timelineEntries = [{
      complaint_id: complaint.id,
      action: 'Complaint raised',
      performed_by: req.user.id,
      performed_by_role: 'student',
      note: `Domain: ${domain}. Priority: ${priority}. ${is_anonymous_requested ? 'Anonymity requested.' : ''}`,
    }]

    if (autoFlagged) {
      timelineEntries.push({
        complaint_id: complaint.id,
        action: `⚡ Auto-flagged Urgent — sensitive keyword detected`,
        performed_by: req.user.id,
        performed_by_role: 'system',
        note: `Keyword detected: "${detectedKeyword}". Complaint auto-upgraded to URGENT.`,
      })
    }

    await supabase.from('complaint_timeline').insert(timelineEntries)

    // Notify assigned council member
    if (assigned) {
      notifyAssignment(assigned, formatComplaintNo(complaint.complaint_no), domain, complaint.id)
    }

    // Notify student that complaint was received
    notifyComplaintCreated(req.user.id, formatComplaintNo(complaint.complaint_no), domain, complaint.id)

    res.status(201).json({
      ...complaint,
      complaint_no_display: formatComplaintNo(complaint.complaint_no),
      auto_flagged: autoFlagged,
      detected_keyword: detectedKeyword,
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
    } else if (role === 'council_member') {
      query = query.eq('assigned_council_member_id', userId)
    } else if (role === 'class_teacher') {
      // Show all complaints currently at teacher level; filtered by section if teacher has one
      query = query.eq('current_handler_role', 'class_teacher')
      // Note: section-based filtering is handled client-side after fetching student info
    } else if (role === 'coordinator') {
      // Show complaints at coordinator level, plus ones they escalated to principal
      query = query.in('current_handler_role', ['coordinator', 'principal'])
    }
    // principal, vice_principal, and supervisor see all

    const { data: complaints, error } = await query
    if (error) throw error

    const formatted = (complaints || []).map(c => {
      const result = {
        ...c,
        complaint_no_display: formatComplaintNo(c.complaint_no),
      }

      // Anonymity: hide student info from teacher/coordinator if not revealed
      // principal and vice_principal always see full identity
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
    if (role === 'council_member' && complaint.assigned_council_member_id !== userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const result = {
      ...complaint,
      complaint_no_display: formatComplaintNo(complaint.complaint_no),
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

    // Apply anonymity for teacher/coordinator (principal and vice_principal always see full identity)
    if (["class_teacher", "coordinator"].includes(role) && complaint.is_anonymous_requested && !complaint.identity_revealed) {
      result.student = { id: null, name: "Anonymous Student", scholar_no: null, section: null, house: null }
    }

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
      .update({ status: 'verified', updated_at: new Date().toISOString(), sla_deadline: slaDeadline })
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

    const allowedRoles = ['council_member', 'class_teacher', 'coordinator', 'principal', 'vice_principal']
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Not allowed' })
    }

    const { data, error } = await supabase
      .from('complaints')
      .update({ status: 'resolved', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error || !data) return res.status(404).json({ error: 'Complaint not found' })

    await supabase.from('complaint_timeline').insert({
      complaint_id: id,
      action: 'Complaint resolved',
      performed_by: userId,
      performed_by_role: role,
      note: note || 'Issue resolved.',
    })

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

    // Log to escalations table
    await supabase.from('escalations').insert({
      complaint_id: id,
      escalated_by: userId,
      escalated_to_role: handlerRoleMap[escalate_to],
      student_consent: !!reveal_identity,
      reason: reason || null,
    })

    const identityNote = reveal_identity
      ? 'Student identity revealed to next handler.'
      : 'Student identity kept anonymous for next handler.'

    await supabase.from('complaint_timeline').insert({
      complaint_id: id,
      action: `Escalated to ${handlerRoleMap[escalate_to].replace(/_/g, ' ')}`,
      performed_by: userId,
      performed_by_role: role,
      note: `${reason ? reason + '. ' : ''}${identityNote}`,
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

    // Build the update payload
    const updatePayload = { status: 'voting', updated_at: new Date().toISOString() }
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
router.patch('/:id/assign', verifyToken, async (req, res) => {
  try {
    const { role } = req.user
    if (!['coordinator', 'principal'].includes(role)) {
      return res.status(403).json({ error: 'Not allowed' })
    }
    const { id } = req.params
    const { council_member_id } = req.body

    const { data, error } = await supabase
      .from('complaints')
      .update({ assigned_council_member_id: council_member_id, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    res.json({ ...data, complaint_no_display: formatComplaintNo(data.complaint_no) })
  } catch (err) {
    res.status(500).json({ error: 'Assignment failed' })
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
      // Add final timeline entry before deletion
      await supabase.from('complaint_timeline').insert({
        complaint_id: delReq.complaint_id,
        action: '🗑️ Complaint deleted — dual approval granted',
        performed_by: req.user.id,
        performed_by_role: req.user.role,
        note: note || 'Deleted after supervisor approval. Complaint was identified as invalid/gibberish.',
      })
      // Delete the complaint
      await supabase.from('complaints').delete().eq('id', delReq.complaint_id)
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

// GET /api/complaints/export/csv — CSV export for principal/supervisor
router.get('/export/csv', verifyToken, async (req, res) => {
  try {
    const { role } = req.user
    if (!['principal', 'supervisor', 'coordinator'].includes(role)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { data: complaints, error } = await supabase
      .from('complaints')
      .select('*, student:student_id(name, scholar_no, section), council_member:assigned_council_member_id(name)')
      .order('created_at', { ascending: false })

    if (error) throw error

    const headers = ['Complaint No', 'Domain', 'Priority', 'Status', 'Student', 'Scholar No', 'Section', 'Council Member', 'Date Raised', 'Last Updated', 'Description']
    const rows = (complaints || []).map(c => [
      formatComplaintNo(c.complaint_no),
      c.domain,
      c.priority || 'normal',
      c.status,
      c.student?.name || '',
      c.student?.scholar_no || '',
      c.student?.section || '',
      c.council_member?.name || '',
      new Date(c.created_at).toLocaleDateString('en-IN'),
      new Date(c.updated_at).toLocaleDateString('en-IN'),
      `"${(c.description || '').replace(/"/g, '""')}"`,
    ])

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="vox-dpsi-${new Date().toISOString().slice(0,10)}.csv"`)
    res.send(csv)
  } catch (err) {
    res.status(500).json({ error: 'Export failed' })
  }
})

export default router
