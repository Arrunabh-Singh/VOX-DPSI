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
  const [step, setStep] = useState(1) // 1: choose target, 2: anonymity decision, 3: reason
  const [target, setTarget] = useState('')
  const [revealIdentity, setRevealIdentity] = useState(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const targets = ESCALATION_TARGETS[userRole] || []
  const isAnonymous = complaint?.is_anonymous_requested
  // Principal always sees full identity — no choice needed
  const isEscalatingToPrincipal = target === 'escalated_to_principal'
  const showAnonymityDecision = isAnonymous && !isEscalatingToPrincipal

  const handleEscalate = async () => {
    if (!target) return toast.error('Please select escalation target')
    if (showAnonymityDecision && revealIdentity === null) return toast.error('Please decide on identity reveal')

    setLoading(true)
    try {
      await api.patch(`/api/complaints/${complaint.id}/escalate`, {
        escalate_to: target,
        // Auto-reveal when escalating to principal; otherwise respect the decision
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-[#003366] rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">Escalate Complaint</h2>
            <p className="text-blue-200 text-sm">{complaint?.complaint_no_display}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: Target */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Escalate to</label>
            <div className="space-y-2">
              {targets.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTarget(t.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                    target === t.value
                      ? 'border-[#003366] bg-blue-50 text-[#003366]'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Anonymity decision — only if student requested it AND not escalating to principal */}
          {showAnonymityDecision && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="font-semibold text-purple-800 text-sm mb-1">⚠️ Anonymous Request</p>
              <p className="text-purple-700 text-sm mb-3">
                This student requested anonymity. Should their identity be revealed to the next handler?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRevealIdentity(false)}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                    revealIdentity === false
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-purple-300 text-purple-700'
                  }`}
                >
                  No, Keep Anonymous
                </button>
                <button
                  onClick={() => setRevealIdentity(true)}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                    revealIdentity === true
                      ? 'bg-orange-500 text-white'
                      : 'bg-white border border-orange-300 text-orange-700'
                  }`}
                >
                  Yes, Reveal Identity
                </button>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason for escalation <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Briefly explain why this complaint is being escalated..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {/* Show info banner when escalating to principal */}
            {isEscalatingToPrincipal && isAnonymous && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                ℹ️ The Principal will see the student's full identity as this is the final escalation level.
              </div>
            )}
            <button
              onClick={handleEscalate}
              disabled={loading || !target || (showAnonymityDecision && revealIdentity === null)}
              className="flex-1 py-3 bg-[#003366] text-white rounded-xl font-semibold hover:bg-[#002952] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Escalating...' : 'Confirm Escalation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
