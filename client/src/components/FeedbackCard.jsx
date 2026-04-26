import { useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function FeedbackCard({ complaintId, onDone }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!rating) return toast.error('Please select a rating')
    setLoading(true)
    try {
      await api.patch(`/api/complaints/${complaintId}/feedback`, { rating, note })
      setSubmitted(true)
      if (onDone) onDone()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="glass rounded-2xl p-6 mb-5 text-center" style={{ border: '2px solid #DCFCE7' }}>
        <p className="text-3xl mb-2">🙏</p>
        <p className="font-bold text-gray-700">Thank you for your feedback!</p>
        <p className="text-gray-500 text-sm mt-1">Your response helps us improve Vox DPSI.</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-6 mb-5" style={{ border: '2px solid #DCFCE7' }}>
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">✅</span>
        <div>
          <p className="font-bold text-gray-800">Your complaint has been resolved.</p>
          <p className="text-gray-500 text-sm">How satisfied are you with the outcome?</p>
        </div>
      </div>

      {/* Star rating */}
      <div className="flex gap-2 mb-4" style={{ fontSize: '32px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: (hover || rating) >= star ? '#c9a84c' : '#D1D5DB', transition: 'color 0.1s' }}
            aria-label={`Rate ${star} star`}
          >★</button>
        ))}
      </div>

      {rating > 0 && (
        <div className="mb-4">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="Tell us more... (optional)"
            className="w-full rounded-xl px-3 py-2 text-sm resize-none focus:outline-none"
            style={{ border: '1.5px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.8)' }}
            onFocus={e => e.target.style.borderColor = '#2d5c26'}
            onBlur={e => e.target.style.borderColor = 'rgba(45,92,38,0.15)'}
          />
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !rating}
        className="w-full py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
        style={{ background: '#16A34A', color: '#fff', border: 'none' }}
      >
        {loading ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </div>
  )
}
