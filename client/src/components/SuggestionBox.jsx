import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { key: 'general', label: '💬 General', desc: 'General feedback or idea' },
  { key: 'feature', label: '✨ Feature Request', desc: 'Something new to add' },
  { key: 'ui', label: '🎨 UI / Design', desc: 'Look and feel improvements' },
  { key: 'bug', label: '🐛 Bug Report', desc: 'Something broken' },
  { key: 'other', label: '📋 Other', desc: 'Anything else' },
]

const STATUS_COLORS = {
  pending: { bg: '#F3F4F6', color: '#6B7280', label: 'Pending' },
  acknowledged: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Acknowledged' },
  under_review: { bg: '#FEF3C7', color: '#D97706', label: 'Under Review' },
  implemented: { bg: '#DCFCE7', color: '#16A34A', label: 'Implemented ✓' },
  dismissed: { bg: '#FEE2E2', color: '#DC2626', label: 'Dismissed' },
}

export default function SuggestionBox() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('general')
  const [loading, setLoading] = useState(false)
  const [mysuggestions, setMySuggestions] = useState([])
  const [submitted, setSubmitted] = useState(false)

  const fetchMySuggestions = async () => {
    try {
      const res = await api.get('/api/suggestions')
      setMySuggestions(res.data || [])
    } catch {}
  }

  useEffect(() => { fetchMySuggestions() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return toast.error('Please add a title')
    if (body.length < 20) return toast.error('Suggestion must be at least 20 characters')
    setLoading(true)
    try {
      await api.post('/api/suggestions', { title, body, category })
      toast.success('Suggestion submitted! Thank you 🙏')
      setTitle('')
      setBody('')
      setCategory('general')
      setSubmitted(true)
      setOpen(false)
      fetchMySuggestions()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Suggestion Box Card */}
      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-base" style={{ color: '#2d5c26' }}>💡 Suggestion Box</h3>
            <p className="text-xs text-gray-500 mt-0.5">Help us improve Vox DPSI — your ideas matter</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#a07b30)', color: '#fff' }}
          >
            + New
          </button>
        </div>

        {/* My previous suggestions */}
        {mysuggestions.length > 0 && (
          <div className="space-y-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(45,92,38,0.08)' }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Your Submissions</p>
            {mysuggestions.slice(0, 3).map(s => {
              const sc = STATUS_COLORS[s.status] || STATUS_COLORS.pending
              return (
                <div key={s.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl" style={{ background: 'rgba(45,92,38,0.04)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{s.title}</p>
                    <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <span style={{ background: sc.bg, color: sc.color, fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                    {sc.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {mysuggestions.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-400 text-xs">No suggestions yet — share your first idea!</p>
          </div>
        )}
      </div>

      {/* Submit Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: 'rgba(10,25,15,0.72)' }}
          onClick={e => e.target === e.currentTarget && setOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            className="glass-modal w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#c9a84c,#a07b30)' }}>
              <div>
                <h2 className="text-white font-bold text-lg">💡 Submit a Suggestion</h2>
                <p className="text-amber-100 text-xs mt-0.5">Your feedback helps build a better Vox DPSI</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Category */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Category</p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCategory(c.key)}
                      className="p-2.5 rounded-xl border-2 text-left text-xs transition-all"
                      style={category === c.key
                        ? { borderColor: '#c9a84c', background: '#FFFBEB', color: '#92400E' }
                        : { borderColor: '#E5E7EB', color: '#6B7280' }}
                    >
                      <span className="font-bold block">{c.label}</span>
                      <span className="opacity-70">{c.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Title <span className="text-red-400">*</span></label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder="One-line summary of your suggestion..."
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1.5px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.9)' }}
                  onFocus={e => e.target.style.borderColor = '#c9a84c'}
                  onBlur={e => e.target.style.borderColor = 'rgba(45,92,38,0.15)'}
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Details <span className="text-red-400">*</span></label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={4}
                  placeholder="Describe your suggestion in detail (min 20 characters)..."
                  className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none"
                  style={{ border: '1.5px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.9)' }}
                  onFocus={e => e.target.style.borderColor = '#c9a84c'}
                  onBlur={e => e.target.style.borderColor = 'rgba(45,92,38,0.15)'}
                />
                <p className={`text-xs mt-1 ${body.length >= 20 ? 'text-green-600' : 'text-gray-400'}`}>{body.length} / 20 minimum</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200">Cancel</button>
                <button
                  type="submit"
                  disabled={loading || !title.trim() || body.length < 20}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#c9a84c,#a07b30)' }}
                >
                  {loading ? 'Submitting...' : 'Submit Suggestion'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
