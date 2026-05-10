import express from 'express'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

const ALLOWED_DELEGATOR_ROLES  = ['council_member', 'supervisor']
const ALLOWED_ADMIN_ROLES      = ['principal', 'vice_principal', 'coordinator']

// ── GET /api/delegations ─────────────────────────────────────────────────────
// Council member: returns delegations they created or that cover them as delegate.
// Admin roles: returns all delegations in the system (for oversight).
router.get('/', verifyToken, async (req, res) => {
  try {
    const { user } = req
    let query = supabase
      .from('delegation_rules')
      .select(`
        id, start_date, end_date, reason, created_at,
        delegator:delegator_id (id, name, section, role),
        delegate:delegate_id  (id, name, section, role),
        created_by_user:created_by (id, name, role)
      `)
      .order('created_at', { ascending: false })

    if (!ALLOWED_ADMIN_ROLES.includes(user.role)) {
      // Non-admin: only see own delegations (as delegator OR delegate)
      query = query.or(`delegator_id.eq.${user.id},delegate_id.eq.${user.id}`)
    }

    const { data, error } = await query
    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('GET /delegations:', err)
    res.status(500).json({ error: 'Failed to fetch delegations' })
  }
})

// ── POST /api/delegations ────────────────────────────────────────────────────
// Create a delegation. Council members can only delegate on behalf of themselves.
// Admin roles can force-delegate any council member.
router.post('/', verifyToken, async (req, res) => {
  try {
    const { user } = req
    const { delegator_id, delegate_id, start_date, end_date, reason } = req.body

    // Validate required fields
    if (!delegate_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'delegate_id, start_date, and end_date are required' })
    }
    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ error: 'start_date must be on or before end_date' })
    }

    const diffDays = (new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)
    if (diffDays > 30) {
      return res.status(400).json({ error: 'Delegation period cannot exceed 1 month' })
    }

    // Determine effective delegator
    let effectiveDelegatorId
    if (ALLOWED_ADMIN_ROLES.includes(user.role)) {
      // Admins can force-delegate any council member
      effectiveDelegatorId = delegator_id || user.id
    } else if (ALLOWED_DELEGATOR_ROLES.includes(user.role)) {
      // Council members can only delegate themselves
      if (delegator_id && delegator_id !== user.id) {
        return res.status(403).json({ error: 'You can only delegate your own cases' })
      }
      effectiveDelegatorId = user.id
    } else {
      return res.status(403).json({ error: 'Your role cannot create delegations' })
    }

    // Cannot delegate to yourself
    if (effectiveDelegatorId === delegate_id) {
      return res.status(400).json({ error: 'Cannot delegate to yourself' })
    }

    // Verify delegate exists and is a council member or supervisor
    const { data: delegateUser, error: duErr } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('id', delegate_id)
      .single()
    if (duErr || !delegateUser) return res.status(404).json({ error: 'Delegate user not found' })
    if (!ALLOWED_DELEGATOR_ROLES.includes(delegateUser.role)) {
      return res.status(400).json({ error: 'Delegate must be a council member or supervisor' })
    }

    // Check for overlapping delegation (same delegator already has active delegation in this range)
    const { data: existing } = await supabase
      .from('delegation_rules')
      .select('id, start_date, end_date')
      .eq('delegator_id', effectiveDelegatorId)
      .lte('start_date', end_date)
      .gte('end_date', start_date)
      .limit(1)

    if (existing && existing.length > 0) {
      return res.status(409).json({
        error: `A delegation already exists for this period (${existing[0].start_date} – ${existing[0].end_date}). Cancel it first.`,
      })
    }

    const { data, error } = await supabase
      .from('delegation_rules')
      .insert({
        delegator_id:  effectiveDelegatorId,
        delegate_id,
        start_date,
        end_date,
        reason:       reason || null,
        created_by:   user.id,
      })
      .select(`
        id, start_date, end_date, reason, created_at,
        delegator:delegator_id (id, name, section, role),
        delegate:delegate_id  (id, name, section, role)
      `)
      .single()

    if (error) throw error

    res.status(201).json(data)
  } catch (err) {
    console.error('POST /delegations:', err)
    res.status(500).json({ error: 'Failed to create delegation' })
  }
})

// ── DELETE /api/delegations/:id ──────────────────────────────────────────────
// Cancel (delete) a delegation. Council member can cancel own; admins can cancel any.
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { user } = req
    const { id }   = req.params

    // Fetch to verify ownership
    const { data: rule, error: fetchErr } = await supabase
      .from('delegation_rules')
      .select('id, delegator_id')
      .eq('id', id)
      .single()

    if (fetchErr || !rule) return res.status(404).json({ error: 'Delegation not found' })

    const canDelete =
      rule.delegator_id === user.id ||
      ALLOWED_ADMIN_ROLES.includes(user.role)

    if (!canDelete) return res.status(403).json({ error: 'Not authorised to cancel this delegation' })

    const { error } = await supabase.from('delegation_rules').delete().eq('id', id)
    if (error) throw error

    res.json({ message: 'Delegation cancelled' })
  } catch (err) {
    console.error('DELETE /delegations/:id:', err)
    res.status(500).json({ error: 'Failed to cancel delegation' })
  }
})

// ── GET /api/delegations/active-for-me ──────────────────────────────────────
// Returns the active delegation covering today where I (council member) am the DELEGATE.
// Used by CouncilDashboard to show a banner if acting on behalf of someone.
router.get('/active-for-me', verifyToken, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('delegation_rules')
      .select(`
        id, start_date, end_date, reason,
        delegator:delegator_id (id, name, section)
      `)
      .eq('delegate_id', req.user.id)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('start_date', { ascending: true })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active delegations' })
  }
})

export default router
