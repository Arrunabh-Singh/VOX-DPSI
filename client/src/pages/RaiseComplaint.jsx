import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import FileUpload from '../components/FileUpload'
import { DOMAINS } from '../utils/constants'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function RaiseComplaint() {
  const navigate = useNavigate()
  useEffect(() => { document.title = 'Raise a Complaint — Vox DPSI' }, [])
  const [domain, setDomain]           = useState('')
  const [description, setDescription] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [loading, setLoading]         = useState(false)
  const [success, setSuccess]         = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!domain) return toast.error('Please select a domain')
    if (description.length < 50) return toast.error('Description must be at least 50 characters')
    setLoading(true)
    try {
      const res = await api.post('/api/complaints', {
        domain, description,
        is_anonymous_requested: isAnonymous,
        attachment_url: attachmentUrl || undefined,
      })
      setSuccess(res.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit complaint')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen" style={{ background: '#EEF2EC' }}>
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="glass-modal rounded-2xl p-10">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: '#DCFCE7' }}>
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-2xl font-black mb-2" style={{ color: '#1B4D2B' }}>Complaint Submitted!</h2>
            <p className="text-gray-500 mb-6">Your complaint has been registered and assigned to a council member.</p>

            <div className="rounded-xl p-5 mb-6 glass-dark">
              <p className="text-sm font-medium mb-1" style={{ color: '#A7C4B0' }}>Your complaint number</p>
              <p className="font-black text-4xl tracking-wider" style={{ color: '#F0B429' }}>{success.complaint_no_display}</p>
            </div>

            {isAnonymous && (
              <div className="rounded-xl p-4 mb-6 text-left" style={{ background: '#FAF5FF', border: '1px solid #DDD6FE' }}>
                <p className="text-purple-800 font-semibold text-sm">🔒 Anonymity Requested</p>
                <p className="text-purple-600 text-sm mt-1">Your council member can see your name. Anonymity applies to further escalations.</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-3 rounded-xl font-semibold text-gray-600 transition-colors"
                style={{ border: '1.5px solid #E5E7EB' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >Back to Dashboard</button>
              <button
                onClick={() => navigate(`/complaints/${success.id}`)}
                className="flex-1 py-3 text-white rounded-xl font-semibold"
                style={{ background: 'linear-gradient(135deg,#1B4D2B,#2A6B3F)' }}
              >View Complaint</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#EEF2EC' }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl transition-colors font-medium text-sm"
            style={{ color: '#1B4D2B' }}
            onMouseEnter={e => e.currentTarget.style.background = '#DCFCE7'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >← Back</button>
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#1B4D2B' }}>Raise a Complaint</h1>
            <p className="text-gray-500 text-sm">Fill in the details below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Domain */}
          <div className="glass rounded-2xl p-6">
            <label className="block text-sm font-bold mb-3" style={{ color: '#1B4D2B' }}>
              Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(DOMAINS).map(([key, d]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDomain(key)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-semibold"
                  style={domain === key
                    ? { borderColor: '#1B4D2B', background: '#F0FDF4', color: '#1B4D2B' }
                    : { borderColor: '#E5E7EB', color: '#6B7280' }}
                >
                  <span>{d.icon}</span><span>{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="glass rounded-2xl p-6">
            <label className="block text-sm font-bold mb-1" style={{ color: '#1B4D2B' }}>
              Description <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">Minimum 50 characters. Be specific and factual.</p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
              placeholder="Describe the issue in detail. Include location, time, people involved, and what outcome you expect..."
              className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none transition-all"
              style={{ border: '1.5px solid #D1FAE5', background: 'rgba(255,255,255,0.7)' }}
              onFocus={e => e.target.style.borderColor = '#1B4D2B'}
              onBlur={e => e.target.style.borderColor = '#D1FAE5'}
            />
            <p className={`text-xs mt-1 ${description.length >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
              {description.length} / 50 characters minimum
            </p>
          </div>

          {/* Attachment */}
          <div className="glass rounded-2xl p-6">
            <label className="block text-sm font-bold mb-3" style={{ color: '#1B4D2B' }}>
              Attachment <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <FileUpload onUpload={(url) => setAttachmentUrl(url)} label="Upload image, PDF, or document" />
          </div>

          {/* Anonymity toggle */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: '#1B4D2B' }}>Request Anonymity</p>
                <p className="text-xs text-gray-500 mt-1">Your name will still be visible to your assigned council member. Anonymity applies to further escalations only.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
                style={{ background: isAnonymous ? '#1B4D2B' : '#D1D5DB' }}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isAnonymous ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            {isAnonymous && (
              <div className="mt-3 rounded-xl px-4 py-2.5 flex items-center gap-2" style={{ background: '#FAF5FF' }}>
                <span className="text-purple-600">🔒</span>
                <span className="text-purple-700 text-xs font-medium">Anonymity will be requested</span>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-black text-base py-4 rounded-2xl transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#1B4D2B,#2A6B3F)', boxShadow: '0 8px 24px rgba(27,77,43,0.25)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </span>
            ) : 'Submit Complaint'}
          </button>
        </form>
      </main>
    </div>
  )
}
