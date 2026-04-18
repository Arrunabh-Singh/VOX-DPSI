import express from 'express'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router({ mergeParams: true })

// GET /api/complaints/:id/timeline
router.get('/', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase
      .from('complaint_timeline')
      .select(`
        *,
        performer:performed_by (id, name, role)
      `)
      .eq('complaint_id', id)
      .order('created_at', { ascending: true })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch timeline' })
  }
})

// POST /api/complaints/:id/timeline — add note
router.post('/', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const { note } = req.body
    const { id: userId, role } = req.user

    if (!note || note.trim().length === 0) {
      return res.status(400).json({ error: 'Note cannot be empty' })
    }

    const { data, error } = await supabase
      .from('complaint_timeline')
      .insert({
        complaint_id: id,
        action: 'Note added',
        performed_by: userId,
        performed_by_role: role,
        note: note.trim(),
      })
      .select(`*, performer:performed_by (id, name, role)`)
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: 'Failed to add note' })
  }
})

export default router
