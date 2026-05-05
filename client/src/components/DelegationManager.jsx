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

function isActive(d) {
  const today = new Date().toISOString().slice(0, 10)
  return d.start_date <= today && d.end_date >= today
}

function isUpcoming(d) {
  const today = new Date().toISOString().slice(0, 10)
  return d.start_date > today
}

function statusBadge(d) {
  if (isActive(d))   return { label: 'Active',   bg: '#DCFCE7', color: '#16A34A' }
  if (isUpcoming(d)) return { label: 'Upcoming', bg: '#EFF6FF', color: '#2563EB' }
  return                     { label: 'Expired',  bg: '#F3F4F6', color: '#6B7280' }
}

// ── DelegationModal ──────────────────────────────────────────────────────────
function DelegationModal({ councilMembers, currentUserId, isAdmin, onClose, onCreate }) {
  const [delegatorId, setDelegatorId] = useState(currentUserId)
  const [delegateId,  setDelegateId]  = useState('')
  const [startDate,   setStartDate]   = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate,     setEndDate]     = useState('')
  const [reason,      setReason]      = useState('')
  const [saving,      setSaving]      = useState(false)

  const available = councilMembers.filter(u => u.id !== delegatorId)

  const submit = async () => {
    if (!delegateId)     return toast.error('Select a delegate')
    if (!endDate)        return toast.error('Set an end date')
    if (startDate > endDate) return toast.error('End date must be after start date')
    setSaving(true)
    try {
      const payload = { delegate_id: delegateId, start_date: startDate, end_date: endDate, reason }
      if (isAdmin && delegatorId !== currentUserId) payload.delegator_id = delegatorId
      const { data } = await api.post('/api/delegations', payload)
      toast.success('Delegation created')
      onCreate(data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create delegation')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="rounded-2xl p-6 w-full max-w-md shadow-2xl" style={{ background: '#fff', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-lg" style={{ color: '#2d5c26' }}>
            {isAdmin ? '🔁 Force Delegate Cases' : '🔁 Delegate My Cases'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          {/* Admin can pick who to delegate ON BEHALF OF */}
          {isAdmin && (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Delegate cases from</label>
              <select
                value={delegatorId}
                onChange={e => { setDelegatorId(e.target.value); setDelegateId('') }}
                className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{ border: '1.5px solid rgba(45,92,38,0.2)', background: '#fff' }}
              >
                {councilMembers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.section || u.role})</option>
                ))}
              </select>
            </div>
          )}

          {/* Delegate to */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Delegate to *</label>
            <select
              value={delegateId}
              onChange={e => setDelegateId(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              style={{ border: '1.5px solid rgba(45,92,38,0.2)', background: '#fff' }}
            >
              <option value="">— Select council member —</option>
              {available.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.section || u.role})</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">From *</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{ border: '1.5px solid rgba(45,92,38,0.2)', background: '#fff' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">To *</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{ border: '1.5px solid rgba(45,92,38,0.2)', background: '#fff' }}
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Exams, sick leave..."
              className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              style={{ border: '1.5px solid rgba(45,92,38,0.2)', background: '#fff' }}
            />
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Your delegate can view and act on your assigned complaints during this period.
            Your original assignment is preserved — the delegate works in your place.
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !delegateId || !endDate}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
            style={{ background: '#2d5c26' }}
          >
            {saving ? 'Saving…' : '✓ Create Delegation'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DelegationManager ─────────────────────────────────────────────────────────
export default function DelegationManager({ currentUser }) {
  const [delegations,     setDelegations]     = useState([])
  const [councilMembers,  setCouncilMembers]  = useState([])
  const [loading,         setLoading]         = useState(true)
  const [showModal,       setShowModal]       = useState(false)
  const [cancelling,      setCancelling]      = useState(null)

  const isAdmin = ['principal', 'vice_principal', 'coordinator'].includes(currentUser?.role)

  const load = async () => {
    setLoading(true)
    try {
      const [dRes, uRes] = await Promise.all([
        api.get('/api/delegations'),
        api.get('/api/users?role=council_member'),
      ])
      setDelegations(dRes.data)
      setCouncilMembers(uRes.data || [])
    } catch {
      toast.error('Failed to load delegation data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const cancel = async (id) => {
    setCancelling(id)
    try {
      await api.delete(`/api/delegations/${id}`)
      toast.success('Delegation cancelled')
      setDelegations(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel')
    } finally {
      setCancelling(null)
    }
  }

  // Separate "incoming" delegations (I am the delegate) from "outgoing" (I am delegator)
  const outgoing = delegations.filter(d => d.delegator?.id === currentUser?.id)
  const incoming = delegations.filter(d => d.delegate?.id  === currentUser?.id)
  const adminAll = isAdmin ? delegations : []

  if (loading) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-gray-400 text-sm">
        Loading delegations…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header + create button */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-black text-base" style={{ color: '#2d5c26' }}>Case Delegations</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Temporarily hand your assigned complaints to a colleague when you're unavailable.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: '#2d5c26' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1a3d18'}
            onMouseLeave={e => e.currentTarget.style.background = '#2d5c26'}
          >
            + {isAdmin ? 'Force Delegate' : 'Delegate My Cases'}
          </button>
        </div>
      </div>

      {/* Incoming delegations banner — I am the delegate covering for someone */}
      {incoming.filter(isActive).length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE' }}>
          <p className="text-sm font-bold text-blue-800 mb-2">📥 You are currently covering for:</p>
          {incoming.filter(isActive).map(d => (
            <div key={d.id} className="flex items-center gap-2 text-sm text-blue-700">
              <span className="font-semibold">{d.delegator?.name}</span>
              <span className="text-blue-400">·</span>
              <span>{fmtDate(d.start_date)} – {fmtDate(d.end_date)}</span>
              {d.reason && <span className="text-blue-500 italic">"{d.reason}"</span>}
            </div>
          ))}
        </div>
      )}

      {/* My outgoing delegations */}
      {!isAdmin && (
        <DelegationList
          title="My Delegations"
          delegations={outgoing}
          currentUserId={currentUser?.id}
          showDelegatee
          onCancel={cancel}
          cancelling={cancelling}
          emptyMsg="You have no active or upcoming delegations."
        />
      )}

      {/* Incoming (where I am the delegate) */}
      {!isAdmin && incoming.length > 0 && (
        <DelegationList
          title="Covering For"
          delegations={incoming}
          currentUserId={currentUser?.id}
          showDelegator
          readOnly
          onCancel={cancel}
          cancelling={cancelling}
        />
      )}

      {/* Admin overview */}
      {isAdmin && (
        <DelegationList
          title="All System Delegations"
          delegations={adminAll}
          currentUserId={currentUser?.id}
          showDelegator
          showDelegatee
          adminView
          onCancel={cancel}
          cancelling={cancelling}
          emptyMsg="No delegations have been created yet."
        />
      )}

      {showModal && (
        <DelegationModal
          councilMembers={councilMembers}
          currentUserId={currentUser?.id}
          isAdmin={isAdmin}
          onClose={() => setShowModal(false)}
          onCreate={(d) => setDelegations(prev => [d, ...prev])}
        />
      )}
    </div>
  )
}

// ── DelegationList ────────────────────────────────────────────────────────────
function DelegationList({
  title, delegations, currentUserId,
  showDelegator, showDelegatee, adminView, readOnly,
  onCancel, cancelling, emptyMsg,
}) {
  if (delegations.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <p className="text-gray-400 text-sm">{emptyMsg || 'No delegations.'}</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-5">
      <h4 className="font-bold text-sm uppercase tracking-wide mb-4" style={{ color: '#2d5c26' }}>{title}</h4>
      <div className="space-y-3">
        {delegations.map(d => {
          const badge   = statusBadge(d)
          const canCancel = !readOnly && (d.delegator?.id === currentUserId || adminView)
          return (
            <div key={d.id} className="rounded-xl p-4" style={{ background: 'rgba(45,92,38,0.04)', border: '1px solid rgba(45,92,38,0.08)' }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {showDelegator && (
                      <span className="text-sm font-bold text-gray-800">{d.delegator?.name}</span>
                    )}
                    {showDelegator && showDelegatee && (
                      <span className="text-gray-400 text-xs">→</span>
                    )}
                    {showDelegatee && (
                      <span className="text-sm font-bold" style={{ color: '#2d5c26' }}>{d.delegate?.name}</span>
                    )}
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    {fmtDate(d.start_date)} – {fmtDate(d.end_date)}
                    {d.reason && <span className="ml-2 italic">"{d.reason}"</span>}
                  </p>

                  {adminView && d.created_by_user && d.created_by_user.id !== d.delegator?.id && (
                    <p className="text-xs text-orange-500 mt-0.5">Force-delegated by {d.created_by_user.name}</p>
                  )}
                </div>

                {canCancel && badge.label !== 'Expired' && (
                  <button
                    onClick={() => onCancel(d.id)}
                    disabled={cancelling === d.id}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-all flex-shrink-0"
                  >
                    {cancelling === d.id ? 'Cancelling…' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
