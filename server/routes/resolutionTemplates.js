import express from 'express'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

const CAN_WRITE = ['coordinator','principal','supervisor','vice_principal','director','board_member']

// GET /api/resolution-templates?domain=&active=1
router.get('/', verifyToken, async (req, res) => {
  try {
    const { domain, active } = req.query
    let query = supabase
      .from('resolution_templates')
      .select('id,title,domain,body,is_active,use_count,created_at')
      .order('use_count', { ascending: false })
      .order('created_at', { ascending: false })

    if (domain && domain !== 'any') {
      query = query.or(`domain.eq.${domain},domain.eq.any`)
    }
    if (active === '1') query = query.eq('is_active', true)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/resolution-templates — create
router.post('/', verifyToken, async (req, res) => {
  try {
    if (!CAN_WRITE.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorised to create resolution templates' })
    }
    const { title, domain, body } = req.body
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'title and body are required' })
    }
    const { data, error } = await supabase
      .from('resolution_templates')
      .insert({ title: title.trim(), domain: domain || 'any', body: body.trim(), created_by: req.user.id })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/resolution-templates/:id — update
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (!CAN_WRITE.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorised' })
    }
    const { title, domain, body, is_active } = req.body
    const { data, error } = await supabase
      .from('resolution_templates')
      .update({ title: title?.trim(), domain: domain || 'any', body: body?.trim(), is_active, updated_by: req.user.id, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/resolution-templates/:id — soft delete (set inactive)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (!CAN_WRITE.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorised' })
    }
    await supabase.from('resolution_templates').update({ is_active: false, updated_by: req.user.id }).eq('id', req.params.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/resolution-templates/:id/use — increment use_count
router.post('/:id/use', verifyToken, async (req, res) => {
  try {
    // fetch current count then increment
    const { data: tmpl } = await supabase.from('resolution_templates').select('use_count').eq('id', req.params.id).single()
    if (tmpl) {
      await supabase.from('resolution_templates').update({ use_count: (tmpl.use_count || 0) + 1 }).eq('id', req.params.id)
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
