import express from 'express'
import bcrypt from 'bcryptjs'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'
import { allowRoles } from '../middleware/roleGuard.js'

const router = express.Router()

// GET /api/users — list users (principal/coordinator only)
router.get('/', verifyToken, allowRoles('principal', 'coordinator', 'supervisor', 'vice_principal', 'director', 'board_member'), async (req, res) => {
  try {
    const { role } = req.query
    let query = supabase
      .from('users')
      .select('id, name, email, role, scholar_no, section, house, created_at, term_start, term_end, term_role')
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

// PATCH /api/users/:id/term — update term dates for a council member (principal only)
router.patch('/:id/term', verifyToken, allowRoles('principal', 'vice_principal', 'coordinator'), async (req, res) => {
  try {
    const { id } = req.params
    const { term_start, term_end, term_role } = req.body

    if (!term_start && !term_end && !term_role) {
      return res.status(400).json({ error: 'Provide at least one of: term_start, term_end, term_role' })
    }

    const update = {}
    if (term_start !== undefined) update.term_start = term_start || null
    if (term_end   !== undefined) update.term_end   = term_end   || null
    if (term_role  !== undefined) update.term_role  = term_role  || null

    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', id)
      .in('role', ['council_member', 'supervisor'])
      .select('id, name, role, term_start, term_end, term_role')
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'User not found or not a council member' })

    res.json(data)
  } catch (err) {
    console.error('Term update error:', err)
    res.status(500).json({ error: 'Failed to update term' })
  }
})

// GET /api/users/term-expiring — council members whose term expires within 30 days
router.get('/term-expiring', verifyToken, allowRoles('principal', 'vice_principal', 'coordinator', 'supervisor'), async (req, res) => {
  try {
    const today  = new Date().toISOString().slice(0, 10)
    const in30   = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('users')
      .select('id, name, role, section, house, term_start, term_end, term_role')
      .in('role', ['council_member', 'supervisor'])
      .lte('term_end', in30)
      .gte('term_end', today)
      .order('term_end', { ascending: true })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expiring terms' })
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

// PATCH /api/users/me — update own profile (house, section, phone, privacy acknowledgement)
 router.patch('/me', verifyToken, async (req, res) => {
   try {
     const { house, section, phone, is_privacy_acknowledged, onboarding_completed } = req.body
     const allowed = {}
     if (house)   allowed.house   = house
     if (section) allowed.section = section
     if (phone)   allowed.phone   = phone

     // DPDP Act 2023 — privacy notice acknowledgement
     if (is_privacy_acknowledged === true) {
       allowed.is_privacy_acknowledged  = true
       allowed.privacy_acknowledged_at  = new Date().toISOString()
     }

     // Council onboarding completion flag
     if (onboarding_completed === true) {
       allowed.onboarding_completed = true
     }

     if (Object.keys(allowed).length === 0) {
       return res.status(400).json({ error: 'No updatable fields provided' })
     }

     const { data, error } = await supabase
       .from('users')
       .update(allowed)
       .eq('id', req.user.id)
       .select('id, name, email, role, scholar_no, section, house, phone, is_privacy_acknowledged, privacy_acknowledged_at, onboarding_completed')
       .single()

     if (error) throw error
     res.json(data)
   } catch (err) {
     console.error('Update profile error:', err)
     res.status(500).json({ error: 'Failed to update profile' })
   }
 })

// ── GET /api/users/erasure-requests — coordinator/principal view of all erasure requests (#60) ──
router.get('/erasure-requests', verifyToken, allowRoles('coordinator', 'principal', 'supervisor', 'vice_principal'), async (req, res) => {
  try {
    // Join with users table to get name + email for display
    const { data: requests, error } = await supabase
      .from('erasure_requests')
      .select(`
        id, role, reason, status, reviewer_note, reviewed_at, created_at,
        user:user_id ( id, name, email, scholar_no, section )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Flatten user fields for easier frontend consumption
    const shaped = (requests || []).map(r => ({
      id:            r.id,
      user_id:       r.user?.id,
      user_name:     r.user?.name || '(Unknown)',
      user_email:    r.user?.email || null,
      user_scholar:  r.user?.scholar_no || null,
      user_section:  r.user?.section || null,
      user_role:     r.role,
      reason:        r.reason,
      status:        r.status,
      reviewer_note: r.reviewer_note,
      reviewed_at:   r.reviewed_at,
      created_at:    r.created_at,
    }))

    res.json({ requests: shaped })
  } catch (err) {
    console.error('Erasure requests fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch erasure requests' })
  }
})

export default router
