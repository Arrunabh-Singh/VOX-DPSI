import express from 'express'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'
import { formatComplaintNo } from '../utils/complaintNo.js'

const router = express.Router()

// Helper: determine if student identity should be hidden for this role
function shouldHideStudentIdentity(complaint, requestingRole) {
  if (['student', 'council_member', 'supervisor', 'principal'].includes(requestingRole)) {
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
    const { domain, description, is_anonymous_requested, attachment_url } = req.body
    if (!domain || !description) {
      return res.status(400).json({ error: 'domain and description are required' })
    }
    if (description.length < 50) {
      return res.status(400).json({ error: 'Description must be at least 50 characters' })
    }

    // Find an available council member to assign (round-robin or first available)
    const { data: councilMembers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'council_member')

    const assigned = councilMembers && councilMembers.length > 0
      ? councilMembers[Math.floor(Math.random() * councilMembers.length)].id
      : null

    const { data: complaint, error } = await supabase
      .from('complaints')
      .insert({
        student_id: req.user.id,
        domain,
        description,
        is_anonymous_requested: !!is_anonymous_requested,
        attachment_url: attachment_url || null,
        assigned_council_member_id: assigned,
        status: 'raised',
        current_handler_role: 'council_member',
        identity_revealed: false,
      })
      .select('*, complaint_no')
      .single()

    if (error) throw error

    // Add timeline entry
    await supabase.from('complaint_timeline').insert({
      complaint_id: complaint.id,
      action: 'Complaint raised',
      performed_by: req.user.id,
      performed_by_role: 'student',
      note: `Domain: ${domain}. ${is_anonymous_requested ? 'Anonymity requested.' : ''}`,
    })

    res.status(201).json({
      ...complaint,
      complaint_no_display: formatComplaintNo(complaint.complaint_no),
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
      student:student_id (id, name, scholar_no, section),
      council_member:assigned_council_member_id (id, name),
      supervisor:supervisor_id (id, name)
    `).order('created_at', { ascending: false })

    if (role === 'student') {
      query = query.eq('student_id', userId)
    } else if (role === 'council_member') {
      query = query.eq('assigned_council_member_id', userId)
    } else if (role === 'class_teacher') {
      // Show all complaints currently at teacher level (active, in-progress, or resolved there)
      query = query.eq('current_handler_role', 'class_teacher')
    } else if (role === 'coordinator') {
      // Show complaints at coordinator level, plus ones they escalated to principal
      query = query.in('current_handler_role', ['coordinator', 'principal'])
    }
    // principal and supervisor see all

    const { data: complaints, error } = await query
    if (error) throw error

    const formatted = (complaints || []).map(c => {
      const result = {
        ...c,
        complaint_no_display: formatComplaintNo(c.complaint_no),
      }

      // Anonymity: hide student info from teacher/coordinator if not revealed
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

    // Apply anonymity for teacher/coordinator
    if (['class_teacher', 'coordinator'].includes(role) && complaint.is_anonymous_requested && !complaint.identity_revealed) {
      result.student = { id: null, name: 'Anonymous Student', scholar_no: null, section: null, house: null }
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

    const { data, error } = await supabase
      .from('complaints')
      .update({ status: 'verified', updated_at: new Date().toISOString() })
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

    const allowedRoles = ['council_member', 'class_teacher', 'coordinator', 'principal']
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

    res.json({ ...data, complaint_no_display: formatComplaintNo(data.complaint_no) })
  } catch (err) {
    console.error('Escalate error:', err)
    res.status(500).json({ error: 'Escalation failed' })
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

export default router
