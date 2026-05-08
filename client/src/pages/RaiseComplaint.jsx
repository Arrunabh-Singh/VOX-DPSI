import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import FileUpload from '../components/FileUpload'
import { DOMAINS } from '../utils/constants'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { isSuspiciousDescription } from '../utils/spamCheck'

const DPS_SECTIONS = [
  'XII A', 'XII B', 'XII C', 'XII D', 'XII E', 'XII F', 'XII G',
  'XI A', 'XI B', 'XI C', 'XI D', 'XI E', 'XI F', 'XI G',
  'X A', 'X B', 'X C', 'X D',
  'IX A', 'IX B', 'IX C', 'IX D',
  'VIII A', 'VIII B', 'VIII C',
  'VII A', 'VII B', 'VII C',
  'VI A', 'VI B', 'VI C',
]

const DPS_HOUSES = ['Prithvi', 'Agni', 'Akash', 'Vayu']

export default function RaiseComplaint() {
  const navigate = useNavigate()
  const { user } = useAuth()
  useEffect(() => { document.title = 'Raise a Complaint — Vox DPSI' }, [])
  const [domain, setDomain]           = useState('')
  const [description, setDescription] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [priority, setPriority]       = useState('normal')
  const [loading, setLoading]         = useState(false)
  const [success, setSuccess]         = useState(null)
  const [section, setSection]         = useState(user?.section || '')
  const [house, setHouse]             = useState(user?.house || '')
  const [spamWarning, setSpamWarning] = useState(false)

  const doSubmit = async () => {
    setLoading(true)
    try {
      setSpamWarning(false)
      // If student updated their house/section, sync to profile
      if ((house && house !== user?.house) || (section && section !== user?.section)) {
        const updates = {}
        if (house && house !== user?.house) updates.house = house
        if (section && section !== user?.section) updates.section = section
        await api.patch('/api/users/me', updates).catch(() => {}) // fire-and-forget
      }

      const res = await api.post('/api/complaints', {
        domain, description, priority,
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!domain) return toast.error('Please select a domain')
    if (description.length < 50) return toast.error('Description must be at least 50 characters')
    if (isSuspiciousDescription(description)) {
      setSpamWarning(true)
      return
    }
    await doSubmit()
  }

  if (success) {
    return (
      <div className="min-h-screen" style={{ background: '#eae1c4' }}>
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="glass-modal rounded-2xl p-10">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: '#DCFCE7' }}>
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-2xl font-black mb-2" style={{ color: '#2d5c26' }}>Complaint Submitted!</h2>
            <p className="text-gray-500 mb-6">Your complaint has been registered and assigned to a council member.</p>

            <div className="rounded-xl p-5 mb-6 glass-dark">
              <p className="text-sm font-medium mb-1" style={{ color: '#A7C4B0' }}>Your complaint number</p>
              <p className="font-black text-4xl tracking-wider" style={{ color: '#c9a84c' }}>{success.complaint_no_display}</p>
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
                style={{ background: 'linear-gradient(135deg,#2d5c26,#1e3f18)' }}
              >View Complaint</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#eae1c4' }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold mb-4 px-3 py-2 rounded-xl transition-all"
            style={{ color: '#2d5c26', background: 'rgba(45,92,38,0.07)', border: '1px solid rgba(45,92,38,0.12)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(45,92,38,0.13)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(45,92,38,0.07)'}
          >
            <span style={{ fontSize: '16px' }}>←</span> Back to Dashboard
          </button>
          <h1 className="text-2xl font-black" style={{ color: '#2d5c26' }}>📋 Raise a Complaint</h1>
          <p className="text-gray-500 text-sm mt-0.5">Fill in the details below. Your complaint will be reviewed by your council member.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Domain */}
          <div className="glass rounded-2xl p-6">
            <label className="block text-sm font-bold mb-3" style={{ color: '#2d5c26' }}>
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
                    ? { borderColor: '#2d5c26', background: '#F0FDF4', color: '#2d5c26' }
                    : { borderColor: '#E5E7EB', color: '#6B7280' }}
                >
                  <span>{d.icon}</span><span>{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* House & Section — compact chip design */}
          <div className="glass rounded-2xl p-4">
            <label className="block text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#2d5c26' }}>
              Your House &amp; Class
            </label>
            {/* House chips — all 4 in one row */}
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-1.5">House</p>
              <div className="flex gap-2">
                {DPS_HOUSES.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHouse(h)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border"
                    style={house === h
                      ? { borderColor: '#c9a84c', background: '#FEF9EC', color: '#92400E' }
                      : { borderColor: '#E5E7EB', color: '#6B7280', background: 'transparent' }}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
            {/* Section — compact pill grid */}
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Class / Section</p>
              <div className="flex flex-wrap gap-1.5">
                {DPS_SECTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSection(s)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium transition-all border"
                    style={section === s
                      ? { borderColor: '#2d5c26', background: 'rgba(45,92,38,0.1)', color: '#2d5c26', fontWeight: '700' }
                      : { borderColor: '#E5E7EB', color: '#6B7280', background: 'transparent' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="glass rounded-2xl p-6">
            <label className="block text-sm font-bold mb-1" style={{ color: '#2d5c26' }}>
              Description <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">Minimum 50 characters. Be specific and factual.</p>
            <textarea
              value={description}
              onChange={e => {
                setDescription(e.target.value)
                setSpamWarning(false)
              }}
              rows={5}
              placeholder="Describe the issue in detail. Include location, time, people involved, and what outcome you expect..."
              className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none transition-all"
              style={{ border: '1.5px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.7)' }}
              onFocus={e => e.target.style.borderColor = '#2d5c26'}
              onBlur={e => e.target.style.borderColor = 'rgba(45,92,38,0.15)'}
            />
            <p className={`text-xs mt-1 ${description.length >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
              {description.length} / 50 characters minimum
            </p>
          </div>

          {/* Priority */}
          <div className="glass rounded-2xl p-6">
            <label className="block text-sm font-bold mb-3" style={{ color: '#2d5c26' }}>Priority</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'normal', label: '🟢 Normal', desc: 'General issue, non-time-sensitive' },
                { key: 'urgent', label: '🟡 Urgent', desc: 'Needs attention within 24 hours' },
              ].map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPriority(p.key)}
                  className="p-4 rounded-xl border-2 text-left transition-all"
                  style={priority === p.key
                    ? { borderColor: '#c9a84c', background: '#FFFBEB', boxShadow: '0 0 0 1px #c9a84c' }
                    : { borderColor: '#E5E7EB', background: 'transparent' }}
                >
                  <p className="font-bold text-sm text-gray-800">{p.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Attachment */}
          <div className="glass rounded-2xl p-6">
            <label className="block text-sm font-bold mb-3" style={{ color: '#2d5c26' }}>
              Attachment <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <FileUpload onUpload={(url) => setAttachmentUrl(url)} label="Upload image, PDF, or document" />
          </div>

          {/* Anonymity toggle */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: '#2d5c26' }}>Request Anonymity</p>
                <p className="text-xs text-gray-500 mt-1">Your name will still be visible to your assigned council member. Anonymity applies to further escalations only.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
                style={{ background: isAnonymous ? '#2d5c26' : '#D1D5DB' }}
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
          {spamWarning && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A' }}
            >
              <p className="text-sm font-bold mb-3" style={{ color: '#92400E' }}>
                Your description looks unusual. Are you sure it's clear enough for the council to act on?
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={doSubmit}
                  disabled={loading}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-black transition-all disabled:opacity-60"
                  style={{ background: '#D97706', color: '#FFFBEB' }}
                >
                  {loading ? 'Submitting...' : 'Submit Anyway'}
                </button>
                <button
                  type="button"
                  onClick={() => setSpamWarning(false)}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all"
                  style={{ background: 'transparent', color: '#92400E', border: '1.5px solid #FCD34D' }}
                >
                  Let me revise
                </button>
              </div>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-black text-base py-4 rounded-2xl transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#2d5c26,#1e3f18)', boxShadow: '0 8px 24px rgba(0,0,0,0.22)' }}
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
