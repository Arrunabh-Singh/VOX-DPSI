import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, scholar_no, section, house } = req.body
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, role are required' })
    }

    const validRoles = ['student', 'council_member', 'class_teacher', 'coordinator', 'principal', 'supervisor']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const password_hash = await bcrypt.hash(password, 12)

    const { data: user, error } = await supabase
      .from('users')
      .insert({ name, email, password_hash, role, scholar_no, section, house })
      .select('id, name, email, role, scholar_no, section, house, created_at')
      .single()

    if (error) throw error

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, scholar_no: user.scholar_no, section: user.section, house: user.house },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({ token, user })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !user) return res.status(401).json({ error: 'Invalid credentials' })

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, scholar_no: user.scholar_no, section: user.section, house: user.house },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    const { password_hash, ...safeUser } = user
    res.json({ token, user: safeUser })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, scholar_no, section, house, created_at')
      .eq('id', req.user.id)
      .single()

    if (error || !user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

export default router
