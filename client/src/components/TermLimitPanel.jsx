import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function daysLeft(iso) {
  if (!iso) return null
  const diff = new Date(iso + 'T00:00:00') - new Date()
  return Math.ceil(diff / 86400000)
}

function tenureBadge(term_end) {
  if (!term_end) return null
  const days = daysLeft(term_end)
  if (days < 0)  return { label: 'Expired',   bg: '#FEE2E2', color: '#DC2626' }
  if (days <= 7)  return { label: `${days}d left`, bg: '#FEF3C7', color: '#B45309' }
  if (days <= 30) return { label: `${days}d left`, bg: '#FEF9C3', color: '#CA8A04' }
  return { label: `${days}d left`, bg: '#DCFCE7', color: '#16A34A' }
}

// ── TenureBadge (exported for use in other components) ───────────────────────
export function TenureBadge({ term_end, term_role }) {
  const badge = tenureBadge(term_end)
  if (!badge) return null
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: badge.bg, color: badge.color }}
      title={term_role ? `${term_role} · Term ends ${fmtDate(term_end)}` : `Term ends ${fmtDate(term_end)}`}
    >
      ⏳ {badge.label}
    </span>
  )
}

// ── EditTermModal ─────────────────────────────────────────────────────────────
function EditTermModal({ member, onClose, onSave }) {
  const [termStart, setTermStart] = useState(member.term_start || '')
  const [termEnd,   setTermEnd]   = useState(member.term_end   || '')
  const [termRole,  setTermRole]  = useState(member.term_role  || '')
  const [saving,    setSaving]    = useState(false)

  const save = async () => {
    if (termStart && termEnd && termStart > termEnd) {
      return toast.error('End date must be after start date')
    }
    setSaving(true)
    try {
      const { data } = await api.patch(`/api/users/${member.id}/term`, {
        term_start: termStart || null,
        term_end:   termEnd   || null,
        term_role:  termRole  || null,
      })
      toast.success('Term updated')
      onSave(data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update term')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="rounded-2xl p-6 w-full max-w-sm shadow-2xl" style={{ background: '#fff' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-base" style={{ color: '#2d5c26' }}>Edit Term — {member.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Position / Role Title</label>
            <input type="text" value={termRole} onChange={e => setTermRole(e.target.value)}
              placeholder="e.g. House Captain, School President"
              className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              style={{ border: '1.5px solid rgba(45,92,38,0.2)' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Term Start</label>
              <input type="date" value={termStart} onChange={e => setTermStart(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{ border: '1.5px solid rgba(45,92,38,0.2)' }} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Term End</label>
              <input type="date" value={termEnd} min={termStart} onChange={e => setTermEnd(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{ border: '1.5px solid rgba(45,92,38,0.2)' }} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: '#2d5c26' }}>
            {saving ? 'Saving…' : 'Save Term'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── TermLimitPanel ─────────────────────────────────────────────────────────────
export default function TermLimitPanel() {
  const [members,   setMembers]   = useState([])
  const [expiring,  setExpiring]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState(null)   // member being edited
  const [filter,    setFilter]    = useState('all')  // all | active | expiring | noterm

  const load = async () => {
    setLoading(true)
    try {
      const [allRes, expiringRes] = await Promise.all([
        api.get('/api/users?role=council_member'),
        api.get('/api/users/term-expiring'),
      ])
      setMembers(allRes.data || [])
      setExpiring(expiringRes.data || [])
    } catch {
      toast.error('Failed to load council member list')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = (updated) => {
    setMembers(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
    // Refresh expiring list too
    api.get('/api/users/term-expiring').then(r => setExpiring(r.data || [])).catch(() => {})
  }

  const filtered = members.filter(m => {
    if (filter === 'active')   return m.term_end && daysLeft(m.term_end) >= 0
    if (filter === 'expiring') return m.term_end && daysLeft(m.term_end) >= 0 && daysLeft(m.term_end) <= 30
    if (filter === 'noterm')   return !m.term_start && !m.term_end
    return true
  })

  if (loading) return (
    <div className="glass rounded-2xl p-8 text-center text-gray-400 text-sm">Loading term data…</div>
  )

  return (
    <div className="space-y-5">
      {/* Expiry alerts banner */}
      {expiring.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: '#FEF9C3', border: '1.5px solid #FDE047' }}>
          <p className="text-sm font-bold text-yellow-800 mb-2">⏳ {expiring.length} term{expiring.length !== 1 ? 's' : ''} expiring within 30 days:</p>
          <div className="flex flex-wrap gap-2">
            {expiring.map(m => (
              <span key={m.id} className="text-xs px-2.5 py-1 rounded-full font-semibold bg-yellow-100 text-yellow-800">
                {m.name} — {fmtDate(m.term_end)} ({daysLeft(m.term_end)}d)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Header + filters */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h3 className="font-black text-base" style={{ color: '#2d5c26' }}>Council Member Tenure</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Track appointment dates and plan annual rotations.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(45,92,38,0.1)', color: '#2d5c26' }}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all',      label: 'All' },
            { key: 'active',   label: '✅ Active term' },
            { key: 'expiring', label: '⚠️ Expiring soon' },
            { key: 'noterm',   label: '⬜ No term set' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={filter === f.key
                ? { background: '#2d5c26', color: '#c9a84c' }
                : { background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(45,92,38,0.12)', color: '#2d5c26' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Member list */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-gray-400 text-sm">No members match this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => {
            const badge = tenureBadge(m.term_end)
            const days  = daysLeft(m.term_end)
            return (
              <div key={m.id} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-800">{m.name}</span>
                      {m.section && (
                        <span className="text-xs text-gray-400">{m.section}</span>
                      )}
                      {m.term_role && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(45,92,38,0.1)', color: '#2d5c26' }}>
                          {m.term_role}
                        </span>
                      )}
                      {badge && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: badge.bg, color: badge.color }}>
                          ⏳ {badge.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {m.term_start
                        ? <>{fmtDate(m.term_start)} – {m.term_end ? fmtDate(m.term_end) : 'ongoing'}</>
                        : <span className="italic text-gray-400">No term dates set</span>
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => setEditing(m)}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all flex-shrink-0"
                  >
                    ✏️ Edit
                  </button>
                </div>

                {/* Progress bar when term is active */}
                {m.term_start && m.term_end && days >= 0 && (() => {
                  const total  = (new Date(m.term_end) - new Date(m.term_start)) / 86400000
                  const elapsed = total - days
                  const pct    = total > 0 ? Math.min(Math.round((elapsed / total) * 100), 100) : 0
                  return (
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full" style={{ background: 'rgba(45,92,38,0.1)' }}>
                        <div className="h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%`, background: days <= 30 ? '#F59E0B' : '#2d5c26' }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{pct}% of term served</p>
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <EditTermModal
          member={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
