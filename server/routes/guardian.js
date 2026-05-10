import express from 'express'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'
import { allowRoles } from '../middleware/roleGuard.js'
import complaintNo from '../utils/complaintNo.js'

const router = express.Router()

// ── GET /api/guardian/my-children — list students linked to this guardian
router.get('/my-children', verifyToken, allowRoles('guardian'), async (req, res) => {
  try {
    const guardianId = req.user.id

    // Fetch the guardian's direct link (single child)
    const { data: userRec, error: userErr } = await supabase
      .from('users')
      .select('guardian_student_id')
      .eq('id', guardianId)
      .single()

    if (userErr) throw userErr

    const childIds = []

    // Primary link (if set)
    if (userRec?.guardian_student_id) {
      childIds.push(userRec.guardian_student_id)
    }

    // Legacy fallback: students whose vpc_parent_email matches guardian's email
    const { data: legacyChildren, error: legacyErr } = await supabase
      .from('users')
      .select('id')
      .eq('vpc_parent_email', req.user.email)

    if (legacyErr) throw legacyErr

    if (legacyChildren && legacyChildren.length > 0) {
      for (const child of legacyChildren) {
        if (!childIds.includes(child.id)) {
          childIds.push(child.id)
        }
      }
    }

    // If no linked children, return empty array
    if (childIds.length === 0) {
      return res.json([])
    }

    // Fetch student details
    const { data: children, error: kidsErr } = await supabase
      .from('users')
      .select('id, name, scholar_no, section, house')
      .in('id', childIds)

    if (kidsErr) throw kidsErr

    res.json(children || [])
  } catch (err) {
    console.error('Guardian my-children error:', err)
    res.status(500).json({ error: 'Failed to fetch linked students' })
  }
})

// ── GET /api/guardian/complaints — list complaints for linked students
router.get('/complaints', verifyToken, allowRoles('guardian'), async (req, res) => {
  try {
    // First get the child IDs (reuse logic from /my-children)
    const { data: userRec, error: userErr } = await supabase
      .from('users')
      .select('guardian_student_id')
      .eq('id', req.user.id)
      .single()

    if (userErr) throw userErr

    const childIds = []

    if (userRec?.guardian_student_id) {
      childIds.push(userRec.guardian_student_id)
    }

    const { data: legacyChildren, error: legacyErr } = await supabase
      .from('users')
      .select('id')
      .eq('vpc_parent_email', req.user.email)

    if (legacyErr) throw legacyErr

    if (legacyChildren && legacyChildren.length > 0) {
      for (const child of legacyChildren) {
        if (!childIds.includes(child.id)) {
          childIds.push(child.id)
        }
      }
    }

    if (childIds.length === 0) {
      return res.json([])
    }

    // Fetch complaints for these students, with joins used by ComplaintCard
    const { data: complaints, error: compErr } = await supabase
      .from('complaints')
      .select(`
        id,
        complaint_no,
        domain,
        description,
        is_anonymous_requested,
        identity_revealed,
        status,
        priority,
        created_at,
        updated_at,
        student:student_id ( id, name, scholar_no, section, house ),
        council_member:assigned_council_member_id ( id, name ),
        supervisor:supervisor_id ( id, name )
      `)
      .in('student_id', childIds)
      .order('created_at', { ascending: false })

    if (compErr) throw compErr

    // Shape: ensure complaint_no_display exists (VOX-XXXX)
    const shaped = (complaints || []).map(c => ({
      ...c,
      complaint_no_display: complaintNo(c.complaint_no)
    }))

    res.json(shaped)
  } catch (err) {
    console.error('Guardian complaints error:', err)
    res.status(500).json({ error: 'Failed to fetch complaints' })
  }
})

// ── POST /api/guardian/link — link this guardian account to a student by scholar number
router.post('/link', verifyToken, allowRoles('guardian'), async (req, res) => {
  try {
    const { scholar_no } = req.body
    if (!scholar_no || typeof scholar_no !== 'string') {
      return res.status(400).json({ error: 'Scholar number is required' })
    }

    // Find the student with this scholar_no
    const { data: student, error: stuErr } = await supabase
      .from('users')
      .select('id, name, scholar_no, section, house')
      .eq('scholar_no', scholar_no.trim())
      .eq('role', 'student')
      .single()

    if (stuErr || !student) {
      return res.status(404).json({ error: 'Student not found with that scholar number' })
    }

    // Update guardian's guardian_student_id to link to this student
    const { error: updateErr } = await supabase
      .from('users')
      .update({ guardian_student_id: student.id })
      .eq('id', req.user.id)

    if (updateErr) throw updateErr

    res.json({
      message: 'Successfully linked to student',
      child: student
    })
  } catch (err) {
    console.error('Guardian link error:', err)
    res.status(500).json({ error: 'Failed to link student' })
  }
})

export default router
