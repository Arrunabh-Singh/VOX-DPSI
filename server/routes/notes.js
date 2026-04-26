import express from 'express'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'
import { allowRoles } from '../middleware/roleGuard.js'

const router = express.Router({ mergeParams: true })

const STAFF_ROLES = ['council_member', 'class_teacher', 'coordinator', 'principal', 'supervisor']

// GET /api/complaints/:id/notes — get internal notes for a complaint
router.get('/', verifyToken, allowRoles(STAFF_ROLES), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('internal_notes')
      .select('*, author:users!internal_notes_author_id_fkey(id, name, role)')
      .eq('complaint_id', req.params.id)
      .order('created_at', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/complaints/:id/notes — add an internal note
router.post('/', verifyToken, allowRoles(STAFF_ROLES), async (req, res) => {
  const { note } = req.body
  if (!note || note.trim().length < 3) return res.status(400).json({ error: 'Note must be at least 3 characters' })

  try {
    const { data, error } = await supabase
      .from('internal_notes')
      .insert({
        complaint_id: req.params.id,
        author_id: req.user.id,
        note: note.trim(),
      })
      .select('*, author:users!internal_notes_author_id_fkey(id, name, role)')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
