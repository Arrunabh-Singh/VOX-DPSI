/**
 * FeedbackCard — CSAT survey shown to students when their complaint is resolved (#10)
 * 1–5 star rating + optional free-text comment. Skippable; resubmittable.
 */
import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const STARS = [1, 2, 3, 4, 5]
const LABELS = {
  1: 'Not at all satisfied',
  2: 'Slightly satisfied',
  3: 'Somewhat satisfied',
  4: 'Mostly satisfied',
  5: 'Very satisfied',
}

export default function FeedbackCard({ complaintId }) {
  const [existing, setExisting]   = useState(undefined) // undefined = loading
  const [hover, setHover]         = useState(0)
  const [rating, setRating]       = useState(0)
  const [comment, setComment]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [skipped, setSkipped]     = useState(false)

  useEffect(() => {
    api.get(`/api/complaints/${complaintId}/feedback`)
      .then(res => {
        setExisting(res.data)
        if (res.data) {
          setRating(res.data.rating)
          setComment(res.data.comment || '')
          setSubmitted(true)
        }
      })
      .catch(() => setExisting(null))
  }, [complaintId])

  const handleSubmit = async () => {
    if (!rating) return toast.error('Please select a rating')
    setLoading(true)
    try {
      await api.post(`/api/complaints/${complaintId}/feedback`, { rating, comment })
      setSubmitted(true)
      toast.success('Thank you for your feedback!')
    } catch {
      toast.error('Could not save feedback — please try again')
    } finally {
      setLoading(false)
    }
  }

  if (existing === undefined) return null // loading
  if (skipped && !submitted) return null  // user dismissed

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: submitted ? 'rgba(22,163,74,0.04)' : 'rgba(255,255,255,0.6)',
        border: `1px solid ${submitted ? 'rgba(22,163,74,0.2)' : 'rgba(45,92,38,0.1)'}`,
      }}
    >
      {submitted ? (
        <div className="text-center py-1">
          <p className="text-2xl mb-1">{rating >= 4 ? '😊' : rating === 3 ? '😐' : '😟'}</p>
          <p className="font-bold text-sm" style={{ color: '#16A34A' }}>
            Thanks for your feedback!
          </p>
          <div className="flex justify-center gap-0.5 mt-2">
            {STARS.map(s => (
              <span key={s} style={{ fontSize: '18px', color: s <= rating ? '#c9a84c' : '#E5E7EB' }}>★</span>
            ))}
          </div>
          {comment && (
            <p className="text-xs text-gray-500 mt-2 italic">"{comment}"</p>
          )}
          <button
            onClick={() => setSubmitted(false)}
            className="text-xs text-gray-400 underline mt-2"
          >
            Update rating
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-bold text-sm" style={{ color: '#2d5c26' }}>
                Was your concern addressed?
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Your rating is only seen by coordinators and above — not by your council member.
              </p>
            </div>
            <button
              onClick={() => setSkipped(true)}
              className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 ml-3"
            >
              Skip
            </button>
          </div>

          {/* Star rating */}
          <div className="flex gap-1.5 mb-2">
            {STARS.map(s => (
              <button
                key={s}
                type="button"
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(s)}
                className="transition-transform hover:scale-110 focus:outline-none"
                aria-label={`${s} star`}
                style={{ fontSize: '30px', color: s <= (hover || rating) ? '#c9a84c' : '#D1D5DB', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                ★
              </button>
            ))}
          </div>

          {(hover || rating) > 0 && (
            <p className="text-xs font-semibold mb-3" style={{ color: '#2d5c26' }}>
              {LABELS[hover || rating]}
            </p>
          )}

          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Anything else you'd like to share? (optional)"
            className="w-full rounded-xl px-3 py-2 text-xs resize-none focus:outline-none mb-3"
            style={{ border: '1px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.7)' }}
            onFocus={e => e.target.style.borderColor = '#2d5c26'}
            onBlur={e => e.target.style.borderColor = 'rgba(45,92,38,0.15)'}
          />

          <button
            onClick={handleSubmit}
            disabled={loading || !rating}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg,#2d5c26,#1e3f18)' }}
          >
            {loading ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </>
      )}
    </div>
  )
}
