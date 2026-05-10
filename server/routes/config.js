import express from 'express'
import crypto from 'crypto'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'
import { allowRoles } from '../middleware/roleGuard.js'

const router = express.Router()

// Helper: allowed admin roles for config management
const ADMIN_ROLES = ['principal', 'vice_principal', 'coordinator', 'supervisor']

// GET /api/config — list all system config key-value pairs (admins only)
router.get('/', verifyToken, allowRoles(...ADMIN_ROLES), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .order('key', { ascending: true })

    if (error) throw error

    // Shape into a simple { key: value } object
    const config = {}
    ;(data || []).forEach(row => {
      config[row.key] = row.value
    })

    res.json(config)
  } catch (err) {
    console.error('Config fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch configuration' })
  }
})

// ── ASSIGNMENT RULES ─────────────────────────────────────────────────────────

// GET /api/config/assignment-rules — list all assignment rules (admins only)
router.get('/assignment-rules', verifyToken, allowRoles(...ADMIN_ROLES), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .eq('key', 'assignment_rules')
      .single()

    if (error || !data) {
      return res.json({ rules: [] })
    }

    // Parse the JSON value
    let rules = []
    try {
      rules = JSON.parse(data.value)
      if (!Array.isArray(rules)) rules = []
    } catch {
      rules = []
    }

    // Sort by priority (ascending = higher priority first)
    rules.sort((a, b) => (a.priority || 10) - (b.priority || 10))

    res.json({ rules })
  } catch (err) {
    console.error('Assignment rules fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch assignment rules' })
  }
})

// POST /api/config/assignment-rules — add a new rule (principal/coordinator only)
router.post('/assignment-rules', verifyToken, allowRoles('principal', 'coordinator'), async (req, res) => {
  try {
    const { name, condition_type, condition_value, assign_to_id, priority } = req.body

    if (!name || !condition_type || !condition_value || !assign_to_id) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Verify the assign_to user exists and is a council member
    const { data: assignUser, error: userErr } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('id', assign_to_id)
      .eq('role', 'council_member')
      .single()

    if (userErr || !assignUser) {
      return res.status(400).json({ error: 'Invalid council member selected' })
    }

    // Fetch existing rules
    const { data: existing, error: fetchErr } = await supabase
      .from('system_config')
      .select('*')
      .eq('key', 'assignment_rules')
      .single()

    let rules = []
    if (existing && existing.value) {
      try {
        rules = JSON.parse(existing.value)
        if (!Array.isArray(rules)) rules = []
      } catch {}
    }

    // Create new rule
    const newRule = {
      id: crypto.randomUUID(),
      name,
      condition_type,
      condition_value,
      assign_to_id,
      assign_to_name: assignUser.name,
      priority: priority || 10,
      created_at: new Date().toISOString()
    }

    rules.push(newRule)

    // Save
    const { error: saveErr } = await supabase
      .from('system_config')
      .upsert({ key: 'assignment_rules', value: JSON.stringify(rules) })

    if (saveErr) throw saveErr

    res.status(201).json({ ok: true, rule: newRule })
  } catch (err) {
    console.error('Assignment rule add error:', err)
    res.status(500).json({ error: 'Failed to add assignment rule' })
  }
})

// DELETE /api/config/assignment-rules/:id — delete a rule (principal/coordinator only)
router.delete('/assignment-rules/:id', verifyToken, allowRoles('principal', 'coordinator'), async (req, res) => {
  try {
    const { id } = req.params

    // Fetch existing rules
    const { data: existing, error: fetchErr } = await supabase
      .from('system_config')
      .select('*')
      .eq('key', 'assignment_rules')
      .single()

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'No rules found' })
    }

    let rules = []
    try {
      rules = JSON.parse(existing.value)
      if (!Array.isArray(rules)) rules = []
    } catch {}

    // Remove the rule
    rules = rules.filter(r => r.id !== id)

    const { error: saveErr } = await supabase
      .from('system_config')
      .upsert({ key: 'assignment_rules', value: JSON.stringify(rules) })

    if (saveErr) throw saveErr

    res.json({ ok: true })
  } catch (err) {
    console.error('Assignment rule delete error:', err)
    res.status(500).json({ error: 'Failed to delete assignment rule' })
  }
})

// GET /api/config/:key — fetch a single config value by key (admins only)
router.get('/:key', verifyToken, allowRoles(...ADMIN_ROLES), async (req, res) => {
  try {
    const { key } = req.params
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .eq('key', key)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Config key not found' })
      }
      throw error
    }

    res.json(data)
  } catch (err) {
    console.error('Config key fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch configuration key' })
  }
})

// PATCH /api/config/:key — update a config value (principal & vice_principal only)
router.patch('/:key', verifyToken, allowRoles('principal', 'vice_principal'), async (req, res) => {
  try {
    const { key } = req.params
    const { value } = req.body

    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'Value is required' })
    }

    const { data, error } = await supabase
      .from('system_config')
      .update({
        value: String(value),
        updated_at: new Date().toISOString()
      })
      .eq('key', key)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Key does not exist — create it (upsert)
        const { data: newRow, error: insertErr } = await supabase
          .from('system_config')
          .insert({ key, value: String(value) })
          .select()
          .single()
        if (insertErr) throw insertErr
        return res.status(201).json(newRow)
      }
      throw error
    }

    res.json(data)
  } catch (err) {
    console.error('Config update error:', err)
    res.status(500).json({ error: 'Failed to update configuration' })
  }
})

export default router