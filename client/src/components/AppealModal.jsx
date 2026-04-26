import { useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function AppealModal({ complaintId, onClose, onSuccess }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (reason.length < 50) return toast.error('Please provide at least 50 characters explaining your appeal')
    setLoading(true)
    try {
      await api.post(`/api/complaints/${complaintId}/appeal`, { reason })
      toast.success('📋 Appeal submitted. Supervisor and Principal have been notified.')
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to file appeal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="glass-modal rounded-2xl p-6 w-full" style={{ maxWidth: '480px' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-black text-lg" style={{ color: '#2d5c26' }}>File an Appeal</h2>
            <p className="text-gray-500 text-sm mt-0.5">Explain why the resolution was unsatisfactory</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6B7280', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2 text-gray-500">
              Why wasn't this resolved properly?
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={5}
              placeholder="Explain in detail why the resolution was inadequate. Include what outcome you expected and what actually happened..."
              className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none"
              style={{ border: '1.5px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.8)' }}
              onFocus={e => e.target.style.borderColor = '#2d5c26'}
              onBlur={e => e.target.style.borderColor = 'rgba(45,92,38,0.15)'}
            />
            <p className={`text-xs mt-1 ${reason.length >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
              {reason.length} / 50 characters minimum
            </p>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-gray-600 border border-gray-200"
              onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >Cancel</button>
            <button type="submit" disabled={loading || reason.length < 50}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
              style={{ background: '#7C3AED', border: 'none' }}
            >{loading ? 'Submitting...' : '📋 Submit Appeal'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
