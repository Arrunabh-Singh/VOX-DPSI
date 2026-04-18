import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import FileUpload from '../components/FileUpload'
import { DOMAINS } from '../utils/constants'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function RaiseComplaint() {
  const navigate = useNavigate()
  const [domain, setDomain] = useState('')
  const [description, setDescription] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!domain) return toast.error('Please select a domain')
    if (description.length < 50) return toast.error('Description must be at least 50 characters')

    setLoading(true)
    try {
      const res = await api.post('/api/complaints', {
        domain,
        description,
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

  // Success confirmation screen
  if (success) {
    return (
      <div className="min-h-screen bg-[#F5F7FA]">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl shadow-xl p-10">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Complaint Submitted!</h2>
            <p className="text-gray-500 mb-6">Your complaint has been registered and assigned to a council member.</p>

            <div className="bg-[#003366] rounded-xl p-5 mb-6">
              <p className="text-blue-200 text-sm mb-1">Your complaint number</p>
              <p className="text-[#FFD700] font-black text-4xl tracking-wider">
                {success.complaint_no_display}
              </p>
            </div>

            {isAnonymous && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 text-left">
                <p className="text-purple-800 font-semibold text-sm">🔒 Anonymity Requested</p>
                <p className="text-purple-600 text-sm mt-1">
                  Your council member can see your name. Anonymity applies to further escalations.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-3 border border-gray-300 rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => navigate(`/complaints/${success.id}`)}
                className="flex-1 py-3 bg-[#003366] text-white rounded-xl font-semibold hover:bg-[#002952]"
              >
                View Complaint
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-[#003366] hover:bg-blue-50 p-2 rounded-xl transition-colors"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Raise a Complaint</h1>
            <p className="text-gray-500 text-sm">Fill in the details below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Domain */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-800 mb-3">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(DOMAINS).map(([key, d]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDomain(key)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                    domain === key
                      ? 'border-[#003366] bg-blue-50 text-[#003366]'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <span className="text-base">{d.icon}</span>
                  <span>{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-800 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">Minimum 50 characters. Be specific and factual.</p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
              placeholder="Describe the issue in detail. Include location, time, people involved, and what outcome you expect..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
            <p className={`text-xs mt-1 ${description.length >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
              {description.length} / 50 characters minimum
            </p>
          </div>

          {/* Attachment */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-800 mb-3">
              Attachment <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <FileUpload
              onUpload={(url) => setAttachmentUrl(url)}
              label="Upload image, PDF, or document"
            />
          </div>

          {/* Anonymity toggle */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-sm">Request Anonymity</p>
                <p className="text-xs text-gray-500 mt-1">
                  Your name will still be visible to your assigned council member.
                  Anonymity applies to further escalations only.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                  isAnonymous ? 'bg-[#003366]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isAnonymous ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {isAnonymous && (
              <div className="mt-3 bg-purple-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <span className="text-purple-600">🔒</span>
                <span className="text-purple-700 text-xs font-medium">Anonymity will be requested</span>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#003366] hover:bg-[#002952] text-white font-black text-base py-4 rounded-2xl shadow-lg transition-all disabled:opacity-60"
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
