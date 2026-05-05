/**
 * GET /api/audit-log
 * System-wide audit trail — principal, supervisor, coordinator, director
 *
 * Combines three event sources:
 *   • complaint_timeline  — all complaint actions (raise, verify, escalate, resolve…)
 *   • complaint_access_log — passive views of complaint detail pages
 *   • erasure_requests    — DPDP data erasure submissions + reviews
 *
 * Query params:
 *   page         default 1
 *   limit        default 40, max 100
 *   event_type   'timeline' | 'access' | 'erasure' | '' (all)
 *   role         filter by actor role
 *   search       partial match on action text or complaint number
 *   date_from    ISO date (YYYY-MM-DD)
 *   date_to      ISO date (YYYY-MM-DD)
 */

import express from 'express'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'
import { allowRoles } from '../middleware/roleGuard.js'

const router = express.Router()

const ALLOWED = ['principal', 'supervisor', 'coordinator', 'vice_principal', 'director', 'board_member']

router.get('/', verifyToken, allowRoles(...ALLOWED), async (req, res) => {
  try {
    const page       = Math.max(1, parseInt(req.query.page)  || 1)
    const limit      = Math.min(100, Math.max(1, parseInt(req.query.limit) || 40))
    const offset     = (page - 1) * limit
    const eventType  = req.query.event_type || ''
    const roleFilter = req.query.role       || ''
    const search     = (req.query.search    || '').trim()
    const dateFrom   = req.query.date_from  || ''
    const dateTo     = req.query.date_to    || ''

    const events = []

    // ── 1. complaint_timeline ──────────────────────────────────────────────────
    if (!eventType || eventType === 'timeline') {
      let q = supabase
        .from('complaint_timeline')
        .select(`
          id, action, note, performed_by_role, created_at,
          performer:performed_by ( id, name, role ),
          complaint:complaint_id ( id, complaint_no_display, domain, status )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (roleFilter) q = q.eq('performed_by_role', roleFilter)
      if (dateFrom)   q = q.gte('created_at', dateFrom)
      if (dateTo)     q = q.lte('created_at', dateTo + 'T23:59:59Z')

      const { data, error } = await q.range(0, 9999) // fetch all for unified sort
      if (!error && data) {
        data.forEach(e => events.push({
          id:           `tl-${e.id}`,
          event_type:   'timeline',
          action:       e.action,
          note:         e.note || null,
          actor_name:   e.performer?.name || 'System',
          actor_role:   e.performed_by_role || e.performer?.role || '',
          complaint_no: e.complaint?.complaint_no_display || null,
          complaint_id: e.complaint?.id || null,
          domain:       e.complaint?.domain || null,
          status:       e.complaint?.status || null,
          created_at:   e.created_at,
        }))
      }
    }

    // ── 2. complaint_access_log ────────────────────────────────────────────────
    if (!eventType || eventType === 'access') {
      let q = supabase
        .from('complaint_access_log')
        .select(`
          id, access_type, created_at,
          viewer:viewer_id ( id, name, role ),
          complaint:complaint_id ( id, complaint_no_display, domain )
        `)
        .order('created_at', { ascending: false })

      if (roleFilter) {
        // filter by viewer role — need to join via viewer.role
        // Supabase JS doesn't support nested eq on joins; fetch all and filter client-side
      }
      if (dateFrom) q = q.gte('created_at', dateFrom)
      if (dateTo)   q = q.lte('created_at', dateTo + 'T23:59:59Z')

      const { data, error } = await q.range(0, 4999)
      if (!error && data) {
        data.forEach(e => {
          if (roleFilter && e.viewer?.role !== roleFilter) return
          events.push({
            id:           `ac-${e.id}`,
            event_type:   'access',
            action:       `Complaint viewed (${e.access_type || 'view'})`,
            note:         null,
            actor_name:   e.viewer?.name || 'Unknown',
            actor_role:   e.viewer?.role || '',
            complaint_no: e.complaint?.complaint_no_display || null,
            complaint_id: e.complaint?.id || null,
            domain:       e.complaint?.domain || null,
            status:       null,
            created_at:   e.created_at,
          })
        })
      }
    }

    // ── 3. erasure_requests ────────────────────────────────────────────────────
    if (!eventType || eventType === 'erasure') {
      let q = supabase
        .from('erasure_requests')
        .select(`
          id, status, reason, reviewer_note, reviewed_at, created_at,
          requester:user_id ( id, name, role )
        `)
        .order('created_at', { ascending: false })

      if (dateFrom) q = q.gte('created_at', dateFrom)
      if (dateTo)   q = q.lte('created_at', dateTo + 'T23:59:59Z')

      const { data, error } = await q.range(0, 999)
      if (!error && data) {
        data.forEach(e => {
          if (roleFilter && e.requester?.role !== roleFilter) return
          events.push({
            id:           `er-${e.id}`,
            event_type:   'erasure',
            action:       `Data erasure request — ${e.status}`,
            note:         e.reviewer_note || e.reason || null,
            actor_name:   e.requester?.name || 'Unknown',
            actor_role:   e.requester?.role || '',
            complaint_no: null,
            complaint_id: null,
            domain:       null,
            status:       e.status,
            created_at:   e.created_at,
          })
          // Also log the review event if present
          if (e.reviewed_at) {
            events.push({
              id:           `er-rev-${e.id}`,
              event_type:   'erasure',
              action:       `Erasure request reviewed — ${e.status}`,
              note:         e.reviewer_note || null,
              actor_name:   'System / Coordinator',
              actor_role:   'coordinator',
              complaint_no: null,
              complaint_id: null,
              domain:       null,
              status:       e.status,
              created_at:   e.reviewed_at,
            })
          }
        })
      }
    }

    // ── Sort all events desc by created_at ─────────────────────────────────────
    events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    // ── Apply search filter ────────────────────────────────────────────────────
    const searchLower = search.toLowerCase()
    const filtered = search
      ? events.filter(e =>
          e.action?.toLowerCase().includes(searchLower) ||
          e.complaint_no?.toLowerCase().includes(searchLower) ||
          e.actor_name?.toLowerCase().includes(searchLower) ||
          e.note?.toLowerCase().includes(searchLower)
        )
      : events

    // ── Paginate ───────────────────────────────────────────────────────────────
    const total    = filtered.length
    const paginated = filtered.slice(offset, offset + limit)

    res.json({
      events: paginated,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('Audit log error:', err)
    res.status(500).json({ error: 'Failed to fetch audit log' })
  }
})

export default router
