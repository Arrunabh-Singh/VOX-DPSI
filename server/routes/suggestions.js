import express from 'express'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// POST /api/suggestions — student submits a suggestion
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, body, category } = req.body
    if (!title || !body) return res.status(400).json({ error: 'Title and body are required' })
    if (body.length < 20) return res.status(400).json({ error: 'Suggestion must be at least 20 characters' })

    const { data, error } = await supabase.from('suggestions').insert({
      submitted_by: req.user.id,
      title: title.trim(),
      body: body.trim(),
      category: category || 'general',
    }).select().single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    console.error('Suggestion error:', err)
    res.status(500).json({ error: 'Failed to submit suggestion' })
  }
})

// GET /api/suggestions — supervisor/principal see all; students see own
router.get('/', verifyToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user
    let query = supabase
      .from('suggestions')
      .select('*, submitted_by_user:submitted_by(id, name, scholar_no, section)')
      .order('created_at', { ascending: false })

    if (role === 'student') {
      query = query.eq('submitted_by', userId)
    } else if (!['supervisor', 'principal', 'coordinator', 'vice_principal'].includes(role)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { data, error } = await query
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suggestions' })
  }
})

// PATCH /api/suggestions/:id/status — supervisor/principal updates status
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const allowed = ['supervisor', 'principal', 'coordinator']
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Not allowed' })
    const { status, note } = req.body
    const validStatuses = ['pending', 'acknowledged', 'under_review', 'implemented', 'dismissed']
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' })

    const { data, error } = await supabase.from('suggestions')
      .update({ status, reviewer_note: note || null, reviewed_at: new Date().toISOString(), reviewed_by: req.user.id })
      .eq('id', req.params.id)
      .select().single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Update failed' })
  }
})

export default router
