/**
 * AuditLogViewer — system-wide audit trail for principal / supervisor
 *
 * Fetches from GET /api/audit-log with pagination + filters.
 * Combines complaint_timeline, complaint_access_log, erasure_requests.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { DOMAINS } from '../utils/constants'

// ─── Event type config ─────────────────────────────────────────────────────────
const EVENT_TYPES = {
  timeline: { label: 'Action',    icon: '⚡', color: '#4F46E5', bg: 'rgba(79,70,229,0.08)' },
  access:   { label: 'View',      icon: '👁️', color: '#0891B2', bg: 'rgba(8,145,178,0.08)'  },
  erasure:  { label: 'Erasure',   icon: '🗑️', color: '#DC2626', bg: 'rgba(220,38,38,0.08)'  },
}

// ─── Role display labels ───────────────────────────────────────────────────────
const ROLE_LABELS = {
  student:        'Student',
  council_member: 'Council',
  class_teacher:  'Teacher',
  coordinator:    'Coordinator',
  principal:      'Principal',
  supervisor:     'Supervisor',
  vice_principal: 'Vice Principal',
  director:       'Director',
  board_member:   'Board Member',
  external_ic:    'External IC',
  System:         'System',
}

const ROLE_COLORS = {
  student:        '#6B7280',
  council_member: '#4F46E5',
  class_teacher:  '#0891B2',
  coordinator:    '#D97706',
  principal:      '#2d5c26',
  supervisor:     '#7C3AED',
  vice_principal: '#DC2626',
  director:       '#1E3A5F',
  board_member:   '#374151',
  external_ic:    '#B45309',
}

function formatIST(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function RolePill({ role }) {
  const label = ROLE_LABELS[role] || role
  const color = ROLE_COLORS[role] || '#6B7280'
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  )
}

function EventTypePill({ type }) {
  const cfg = EVENT_TYPES[type] || { label: type, icon: '•', color: '#6B7280', bg: 'rgba(107,114,128,0.08)' }
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.icon} {cfg.label}
    </span>
  )
}

const PAGE_SIZES = [20, 40, 100]

export default function AuditLogViewer() {
  const navigate = useNavigate()

  // ─── Filter state ────────────────────────────────────────────────────────────
  const [eventType, setEventType] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [search, setSearch]     = useState('')
  const [searchInput, setSearchInput] = useState('')  // debounced
  const [page, setPage]         = useState(1)
  const [limit, setLimit]       = useState(40)

  // ─── Data state ──────────────────────────────────────────────────────────────
  const [events, setEvents]     = useState([])
  const [total, setTotal]       = useState(0)
  const [pages, setPages]       = useState(1)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  // ─── Debounce search ──────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  // ─── Fetch ───────────────────────────────────────────────────────────────────
  const fetchLog = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page, limit,
        ...(eventType   && { event_type: eventType }),
        ...(roleFilter  && { role: roleFilter }),
        ...(dateFrom    && { date_from: dateFrom }),
        ...(dateTo      && { date_to: dateTo }),
        ...(search      && { search }),
      })
      const res = await api.get(`/api/audit-log?${params}`)
      setEvents(res.data.events   || [])
      setTotal(res.data.total     || 0)
      setPages(res.data.pages     || 1)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }, [page, limit, eventType, roleFilter, dateFrom, dateTo, search])

  useEffect(() => { fetchLog() }, [fetchLog])

  // ─── Export CSV ───────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Timestamp (IST)', 'Event Type', 'Actor', 'Role', 'Complaint', 'Action / Description']
    const rows = events.map(e => [
      formatIST(e.created_at),
      EVENT_TYPES[e.event_type]?.label || e.event_type,
      e.actor_name,
      ROLE_LABELS[e.actor_role] || e.actor_role,
      e.complaint_no || '—',
      `"${(e.action + (e.note ? ` — ${e.note}` : '')).replace(/"/g, '""')}"`,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `vox-dpsi-audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetFilters = () => {
    setEventType(''); setRoleFilter(''); setDateFrom(''); setDateTo('')
    setSearch(''); setSearchInput(''); setPage(1)
  }

  const hasFilters = eventType || roleFilter || dateFrom || dateTo || search

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black" style={{ color: '#2d5c26' }}>System Audit Log</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${total.toLocaleString()} events`}
            {hasFilters && ' (filtered)'}
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={events.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
          style={{ background: '#2d5c26', color: '#c9a84c' }}
        >
          ⬇️ Export CSV
        </button>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-4 mb-4">
        {/* Search */}
        <input
          value={searchInput}
          onChange={e => { setSearchInput(e.target.value); setPage(1) }}
          placeholder="🔍 Search by action, complaint number, or person…"
          className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none mb-3"
          style={{ border: '1px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.9)', color: '#1A1A1A' }}
          onFocus={e => e.target.style.borderColor = '#2d5c26'}
          onBlur={e => e.target.style.borderColor = 'rgba(45,92,38,0.15)'}
        />

        <div className="flex flex-wrap gap-2 items-center">
          {/* Event type */}
          <div className="flex gap-1.5">
            {[['', 'All'], ['timeline', '⚡ Actions'], ['access', '👁️ Views'], ['erasure', '🗑️ Erasure']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => { setEventType(v); setPage(1) }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
                style={eventType === v
                  ? { background: '#2d5c26', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(45,92,38,0.12)', color: '#2d5c26' }}
              >{l}</button>
            ))}
          </div>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
            className="rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none"
            style={{ border: '1px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.8)', color: '#374151' }}
          >
            <option value="">All Roles</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {/* Date range */}
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            className="rounded-xl px-3 py-1.5 text-xs focus:outline-none"
            style={{ border: '1px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.8)', color: '#374151' }}
            title="From date"
          />
          <span className="text-xs text-gray-400">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1) }}
            className="rounded-xl px-3 py-1.5 text-xs focus:outline-none"
            style={{ border: '1px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.8)', color: '#374151' }}
            title="To date"
          />

          {/* Page size */}
          <select
            value={limit}
            onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
            className="ml-auto rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none"
            style={{ border: '1px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.8)', color: '#374151' }}
          >
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)' }}
            >✕ Clear</button>
          )}
        </div>
      </div>

      {/* ── Events table ───────────────────────────────────────────────────── */}
      {error ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-4xl mb-2">⚠️</p>
          <p className="text-red-600 font-semibold">{error}</p>
          <button
            onClick={fetchLog}
            className="mt-3 px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: '#2d5c26', color: '#c9a84c' }}
          >Retry</button>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl h-16 animate-pulse" style={{ opacity: 0.6 - i * 0.05 }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="glass rounded-2xl p-14 text-center">
          <p className="text-5xl mb-3">🗂️</p>
          <h3 className="font-bold text-gray-700 text-lg">No audit events found</h3>
          <p className="text-gray-500 text-sm mt-1">
            {hasFilters ? 'Try adjusting the filters above.' : 'System events will appear here as the platform is used.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(evt => (
            <AuditRow key={evt.id} event={evt} onComplaintClick={id => navigate(`/complaints/${id}`)} />
          ))}
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {pages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-2 rounded-xl text-sm font-bold disabled:opacity-30 transition-all"
            style={{ background: 'rgba(45,92,38,0.08)', color: '#2d5c26' }}
          >‹ Prev</button>

          {/* Page numbers — show up to 7 */}
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
            let p
            if (pages <= 7) p = i + 1
            else if (page <= 4) p = i + 1
            else if (page >= pages - 3) p = pages - 6 + i
            else p = page - 3 + i
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="w-9 h-9 rounded-xl text-sm font-bold transition-all"
                style={page === p
                  ? { background: '#2d5c26', color: '#c9a84c' }
                  : { background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(45,92,38,0.12)', color: '#2d5c26' }}
              >{p}</button>
            )
          })}

          <button
            disabled={page >= pages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-2 rounded-xl text-sm font-bold disabled:opacity-30 transition-all"
            style={{ background: 'rgba(45,92,38,0.08)', color: '#2d5c26' }}
          >Next ›</button>

          <span className="text-xs text-gray-400 ml-2">
            Page {page} of {pages}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Single audit row ────────────────────────────────────────────────────────────
function AuditRow({ event: e, onComplaintClick }) {
  const [expanded, setExpanded] = useState(false)
  const domain = e.domain && DOMAINS[e.domain]

  return (
    <div
      className="glass rounded-xl px-4 py-3 cursor-pointer hover:shadow-md transition-shadow"
      style={{ borderLeft: `3px solid ${EVENT_TYPES[e.event_type]?.color || '#6B7280'}` }}
      onClick={() => setExpanded(x => !x)}
    >
      <div className="flex items-start gap-3">
        {/* Event type pill */}
        <EventTypePill type={e.event_type} />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-800 truncate">{e.action}</span>
            {e.complaint_no && (
              <button
                className="text-xs font-black px-2 py-0.5 rounded-lg"
                style={{ background: 'rgba(45,92,38,0.08)', color: '#2d5c26' }}
                onClick={ev => { ev.stopPropagation(); if (e.complaint_id) onComplaintClick(e.complaint_id) }}
              >
                {e.complaint_no}
              </button>
            )}
            {domain && (
              <span className="text-xs" style={{ color: domain.color }}>{domain.icon} {domain.label}</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">{e.actor_name}</span>
            <RolePill role={e.actor_role} />
            <span className="text-xs text-gray-400 ml-auto">{formatIST(e.created_at)}</span>
          </div>

          {expanded && e.note && (
            <div
              className="mt-2 text-sm text-gray-600 rounded-lg px-3 py-2"
              style={{ background: 'rgba(0,0,0,0.04)', borderLeft: '2px solid rgba(0,0,0,0.08)' }}
            >
              {e.note}
            </div>
          )}
        </div>

        {/* Expand indicator */}
        {e.note && (
          <span className="text-gray-400 text-xs mt-0.5 flex-shrink-0">
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </div>
    </div>
  )
}
