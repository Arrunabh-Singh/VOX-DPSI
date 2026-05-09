import express from 'express'
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
