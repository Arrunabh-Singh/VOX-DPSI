import { useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const ESCALATION_TARGETS = {
  council_member: [
    { value: 'escalated_to_teacher', label: 'Class Teacher' },
    { value: 'escalated_to_coordinator', label: 'Coordinator (Skip Teacher)' },
  ],
  class_teacher: [
    { value: 'escalated_to_coordinator', label: 'Coordinator' },
  ],
  coordinator: [
    { value: 'escalated_to_principal', label: 'Principal' },
  ],
}

export default function EscalateModal({ complaint, userRole, onClose, onSuccess }) {
  const [target, setTarget] = useState('')
  const [revealIdentity, setRevealIdentity] = useState(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const targets = ESCALATION_TARGETS[userRole] || []
  const isAnonymous = complaint?.is_anonymous_requested
  const isEscalatingToPrincipal = target === 'escalated_to_principal'
  const showAnonymityDecision = isAnonymous && !isEscalatingToPrincipal

  const handleEscalate = async () => {
    if (!target) return toast.error('Please select escalation target')
    if (showAnonymityDecision && revealIdentity === null) return toast.error('Please decide on identity reveal')
    setLoading(true)
    try {
      await api.patch(`/api/complaints/${complaint.id}/escalate`, {
        escalate_to: target,
        reveal_identity: isEscalatingToPrincipal ? true : (isAnonymous ? revealIdentity : false),
        reason,
      })
      toast.success('Complaint escalated successfully')
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Escalation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(10,25,15,0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-modal w-full sm:max-w-md overflow-hidden sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#1B4D2B,#163D22)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <h2 className="text-white font-bold text-lg">Escalate Complaint</h2>
            <p className="text-sm" style={{ color: '#A7C4B0' }}>{complaint?.complaint_no_display}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl leading-none transition-colors">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Target selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Escalate to</label>
            <div className="space-y-2">
              {targets.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTarget(t.value)}
                  className="w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium"
                  style={target === t.value
                    ? { borderColor: '#1B4D2B', background: '#F0FDF4', color: '#1B4D2B' }
                    : { borderColor: '#E5E7EB', color: '#374151' }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Anonymity decision */}
          {showAnonymityDecision && (
            <div className="rounded-xl p-4" style={{ background: '#FAF5FF', border: '1px solid #DDD6FE' }}>
              <p className="font-semibold text-purple-800 text-sm mb-1">⚠️ Anonymous Request</p>
              <p className="text-purple-700 text-sm mb-3">This student requested anonymity. Should their identity be revealed to the next handler?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRevealIdentity(false)}
                  className="flex-1 py-2 rounded-lg font-semibold text-sm transition-all"
                  style={revealIdentity === false ? { background: '#7C3AED', color: '#fff' } : { background: '#fff', border: '1px solid #C4B5FD', color: '#7C3AED' }}
                >No, Keep Anonymous</button>
                <button
                  onClick={() => setRevealIdentity(true)}
                  className="flex-1 py-2 rounded-lg font-semibold text-sm transition-all"
                  style={revealIdentity === true ? { background: '#EA580C', color: '#fff' } : { background: '#fff', border: '1px solid #FED7AA', color: '#EA580C' }}
                >Yes, Reveal Identity</button>
              </div>
            </div>
          )}

          {/* Principal auto-reveal notice */}
          {isEscalatingToPrincipal && isAnonymous && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' }}>
              ℹ️ The Principal will see the student's full identity as this is the final escalation level.
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Briefly explain why this complaint is being escalated..."
              className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none transition-all"
              style={{ border: '1.5px solid #D1FAE5', background: 'rgba(255,255,255,0.8)' }}
              onFocus={e => e.target.style.borderColor = '#1B4D2B'}
              onBlur={e => e.target.style.borderColor = '#D1FAE5'}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold text-gray-600 transition-colors"
              style={{ border: '1.5px solid #E5E7EB' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >Cancel</button>
            <button
              onClick={handleEscalate}
              disabled={loading || !target || (showAnonymityDecision && revealIdentity === null)}
              className="flex-1 py-3 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#1B4D2B,#2A6B3F)' }}
            >
              {loading ? 'Escalating...' : 'Confirm Escalation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
