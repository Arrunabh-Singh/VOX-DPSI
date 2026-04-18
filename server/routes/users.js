import express from 'express'
import bcrypt from 'bcryptjs'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'
import { allowRoles } from '../middleware/roleGuard.js'

const router = express.Router()

// GET /api/users — list users (principal/coordinator only)
router.get('/', verifyToken, allowRoles('principal', 'coordinator', 'supervisor'), async (req, res) => {
  try {
    const { role } = req.query
    let query = supabase
      .from('users')
      .select('id, name, email, role, scholar_no, section, house, created_at')
      .order('role')
      .order('name')

    if (role) query = query.eq('role', role)

    const { data, error } = await query
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// POST /api/users — create user (admin)
router.post('/', verifyToken, allowRoles('principal', 'coordinator'), async (req, res) => {
  try {
    const { name, email, password, role, scholar_no, section, house } = req.body
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, role required' })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const { data, error } = await supabase
      .from('users')
      .insert({ name, email, password_hash, role, scholar_no, section, house })
      .select('id, name, email, role, scholar_no, section, house, created_at')
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    console.error('Create user error:', err)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

export default router
