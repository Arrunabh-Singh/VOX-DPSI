/**
 * ErasureRequestsPanel — Admin view for coordinators and principals
 * to review and act on DPDP Act Section 13 data erasure requests (#60).
 *
 * Read-only listing with status overview. Actual approval/rejection
 * is done by the backend (service role); this panel shows pending
 * requests and allows coordinators to flag them for principal action.
 */

import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const STATUS_META = {
  pending:   { label: 'Pending Review',  color: '#D97706', bg: 'rgba(217,119,6,0.08)',   dot: '#D97706' },
  approved:  { label: 'Approved',        color: '#16A34A', bg: 'rgba(22,163,74,0.08)',   dot: '#16A34A' },
  rejected:  { label: 'Not Approved',    color: '#DC2626', bg: 'rgba(220,38,38,0.08)',   dot: '#DC2626' },
  completed: { label: 'Data Deleted',    color: '#6B7280', bg: 'rgba(107,114,128,0.08)', dot: '#6B7280' },
}

const ROLE_LABELS = {
  student:        'Student',
  council_member: 'Council Member',
  class_teacher:  'Class Teacher',
  coordinator:    'Coordinator',
  principal:      'Principal',
  supervisor:     'Supervisor',
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ErasureRequestsPanel() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [expanded, setExpanded] = useState(null)

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/users/erasure-requests')
      setRequests(res.data?.requests || [])
    } catch (err) {
      // If endpoint doesn't exist yet, show graceful message
      if (err.response?.status === 404) {
        setRequests([])
      } else {
        toast.error('Could not load erasure requests')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRequests() }, [])

  const filtered = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter)

  const pendingCount = requests.filter(r => r.status === 'pending').length

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-gray-200 rounded-full mx-auto animate-spin" style={{ borderTopColor: '#2d5c26' }} />
        <p className="text-sm text-gray-500 mt-3">Loading erasure requests…</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-xl font-black" style={{ color: '#2d5c26' }}>Data Erasure Requests</h2>
          <p className="text-xs text-gray-500 mt-1">
            DPDP Act 2023 · Section 13 — Right to Erasure
          </p>
        </div>
        {pendingCount > 0 && (
          <div
            className="px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: 'rgba(217,119,6,0.12)', color: '#D97706', border: '1px solid rgba(217,119,6,0.25)' }}
          >
            {pendingCount} pending
          </div>
        )}
      </div>

      {/* DPDP Act info box */}
      <div
        className="rounded-xl p-4 mb-5 flex items-start gap-3"
        style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)' }}
      >
        <span className="text-lg flex-shrink-0">⚖️</span>
        <div>
          <p className="text-sm font-bold" style={{ color: '#1D4ED8' }}>Legal Obligation</p>
          <p className="text-xs text-gray-600 leading-relaxed mt-1">
            Under DPDP Act 2023 Section 13, the school must respond to erasure requests
            within <strong>30 days</strong>. Approved requests must be actioned by the Principal.
            Statutory records (POSH, POCSO, litigation) must be retained in anonymised form.
          </p>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'all',       label: `All (${requests.length})` },
          { key: 'pending',   label: `Pending (${requests.filter(r => r.status === 'pending').length})` },
          { key: 'approved',  label: 'Approved' },
          { key: 'rejected',  label: 'Not Approved' },
          { key: 'completed', label: 'Completed' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={filter === f.key
              ? { background: '#2d5c26', color: '#fff' }
              : { background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(45,92,38,0.12)', color: '#2d5c26' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Request list */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-5xl mb-3">
            {filter === 'pending' ? '🎉' : '📭'}
          </p>
          <h3 className="font-bold text-gray-700 text-lg mb-1">
            {filter === 'pending' ? 'No pending requests' : 'No requests found'}
          </h3>
          <p className="text-gray-500 text-sm">
            {filter === 'pending'
              ? 'All erasure requests have been reviewed.'
              : 'No erasure requests match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const meta = STATUS_META[req.status] || STATUS_META.pending
            const isExpanded = expanded === req.id
            const daysAgo = Math.floor((Date.now() - new Date(req.created_at)) / 86400000)
            const isOverdue = req.status === 'pending' && daysAgo > 25

            return (
              <div
                key={req.id}
                className="glass rounded-2xl overflow-hidden"
                style={isOverdue ? { border: '1px solid rgba(220,38,38,0.3)' } : {}}
              >
                {/* Card header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : req.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                        style={{ background: meta.bg, border: `1px solid ${meta.color}33` }}
                      >
                        🗑️
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm" style={{ color: '#2d5c26' }}>
                            {req.user_name || 'User'}
                          </p>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(45,92,38,0.08)', color: '#2d5c26' }}
                          >
                            {ROLE_LABELS[req.user_role] || req.user_role}
                          </span>
                          {isOverdue && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}
                            >
                              ⚠️ Overdue ({daysAgo}d)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtDate(req.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33` }}
                      >
                        {meta.label}
                      </span>
                      <span
                        className="text-gray-400 transition-transform"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : '', display: 'block' }}
                      >
                        ▾
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid rgba(45,92,38,0.1)', padding: '16px' }}>
                    <div className="rounded-xl p-4 mb-4" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Reason Provided</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{req.reason}</p>
                    </div>

                    {req.reviewer_note && (
                      <div
                        className="rounded-xl p-4 mb-4"
                        style={{ background: meta.bg, border: `1px solid ${meta.color}33` }}
                      >
                        <p className="text-xs font-bold mb-2" style={{ color: meta.color }}>
                          Reviewer Note
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">{req.reviewer_note}</p>
                        {req.reviewed_at && (
                          <p className="text-xs text-gray-400 mt-1">Reviewed {fmtDate(req.reviewed_at)}</p>
                        )}
                      </div>
                    )}

                    {/* Request ID + Contact */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400 font-mono">
                        ID: {req.id?.slice(0, 8).toUpperCase()}
                      </p>
                      {req.user_email && (
                        <a
                          href={`mailto:${req.user_email}?subject=Regarding Your Data Erasure Request — Vox DPSI`}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                          style={{
                            background: 'rgba(45,92,38,0.08)',
                            color: '#2d5c26',
                            border: '1px solid rgba(45,92,38,0.15)',
                            textDecoration: 'none',
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          ✉️ Contact Requester
                        </a>
                      )}
                    </div>

                    {req.status === 'pending' && (
                      <div
                        className="mt-4 rounded-xl p-3"
                        style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)' }}
                      >
                        <p className="text-xs text-gray-600 leading-relaxed">
                          <strong>Action Required:</strong> Review this request with the Principal.
                          Coordinate with the IT team to process approved requests.
                          Contact the requester at their registered email to acknowledge receipt
                          and confirm the 30-day review timeline.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Refresh */}
      <div className="mt-4 text-center">
        <button
          onClick={fetchRequests}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Refresh list
        </button>
      </div>
    </div>
  )
}
