/**
 * BulkActionBar — floating action bar for mass status updates and bulk assign (#6)
 *
 * Props:
 *   selectedIds  — Set<string> of selected complaint IDs
 *   onClear      — callback to clear selection
 *   onSuccess    — callback after successful bulk action (triggers list refresh)
 *   councilMembers — array of { id, name } for assign dropdown
 */

import { useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: 'in_progress',              label: 'Mark In Progress',       color: '#4F46E5' },
  { value: 'escalated_to_coordinator', label: 'Escalate to Coordinator', color: '#D97706' },
  { value: 'escalated_to_principal',   label: 'Escalate to Principal',   color: '#DC2626' },
  { value: 'resolved',                 label: 'Mark Resolved',           color: '#16A34A' },
  { value: 'closed',                   label: 'Close Complaints',        color: '#6B7280' },
]

export default function BulkActionBar({ selectedIds, onClear, onSuccess, councilMembers = [] }) {
  const [mode, setMode]         = useState(null) // null | 'status' | 'assign'
  const [status, setStatus]     = useState('')
  const [assignTo, setAssignTo] = useState('')
  const [loading, setLoading]   = useState(false)
  const [confirming, setConfirming] = useState(false)

  const count = selectedIds.size

  if (count === 0) return null

  const handleApply = async () => {
    if (!confirming) { setConfirming(true); return }

    if (mode === 'status' && !status) return toast.error('Choose a status')
    if (mode === 'assign' && !assignTo) return toast.error('Choose a council member')

    setLoading(true)
    try {
      const payload = {
        ids:    Array.from(selectedIds),
        action: mode,
        value:  mode === 'status' ? status : assignTo,
      }
      const res = await api.post('/api/complaints/bulk', payload)
      toast.success(`Updated ${res.data.updated} complaint${res.data.updated !== 1 ? 's' : ''}`)
      onClear()
      onSuccess?.()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bulk action failed')
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  const reset = () => {
    setMode(null)
    setStatus('')
    setAssignTo('')
    setConfirming(false)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        width: 'calc(100% - 32px)',
        maxWidth: '560px',
        background: '#1e3f18',
        borderRadius: '18px',
        padding: '14px 16px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.15)',
        border: '1px solid rgba(201,168,76,0.25)',
      }}
    >
      {/* Top row: count + clear */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-black px-2.5 py-1 rounded-full"
            style={{ background: '#c9a84c', color: '#1e3f18' }}
          >
            {count}
          </span>
          <span className="text-sm font-bold" style={{ color: '#fff' }}>
            complaint{count !== 1 ? 's' : ''} selected
          </span>
        </div>
        <button
          onClick={() => { reset(); onClear() }}
          className="text-xs font-semibold px-3 py-1 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          Cancel
        </button>
      </div>

      {/* Mode selector */}
      {!mode && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode('status')}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          >
            🔄 Update Status
          </button>
          {councilMembers.length > 0 && (
            <button
              onClick={() => setMode('assign')}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            >
              👤 Bulk Assign
            </button>
          )}
        </div>
      )}

      {/* Status picker */}
      {mode === 'status' && (
        <div>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setStatus(opt.value); setConfirming(false) }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: status === opt.value ? opt.color : 'rgba(255,255,255,0.1)',
                  color: status === opt.value ? '#fff' : 'rgba(255,255,255,0.75)',
                  border: `1px solid ${status === opt.value ? opt.color : 'rgba(255,255,255,0.15)'}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
            >
              ← Back
            </button>
            <button
              onClick={handleApply}
              disabled={loading || !status}
              className="flex-1 py-2 rounded-xl text-sm font-black disabled:opacity-40 transition-all"
              style={{ background: confirming ? '#DC2626' : '#c9a84c', color: confirming ? '#fff' : '#1e3f18' }}
            >
              {loading ? 'Applying…' : confirming ? `⚠️ Confirm — update ${count} complaints` : `Apply to ${count} complaints →`}
            </button>
          </div>
        </div>
      )}

      {/* Assign picker */}
      {mode === 'assign' && (
        <div>
          <select
            value={assignTo}
            onChange={e => { setAssignTo(e.target.value); setConfirming(false) }}
            className="w-full rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <option value="" style={{ color: '#1A1A1A', background: '#fff' }}>— Select council member —</option>
            {councilMembers.map(m => (
              <option key={m.id} value={m.id} style={{ color: '#1A1A1A', background: '#fff' }}>
                {m.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
            >
              ← Back
            </button>
            <button
              onClick={handleApply}
              disabled={loading || !assignTo}
              className="flex-1 py-2 rounded-xl text-sm font-black disabled:opacity-40"
              style={{ background: confirming ? '#DC2626' : '#c9a84c', color: confirming ? '#fff' : '#1e3f18' }}
            >
              {loading ? 'Applying…' : confirming ? `⚠️ Confirm — assign ${count} complaints` : `Assign ${count} complaints →`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
