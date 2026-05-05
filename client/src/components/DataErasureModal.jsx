/**
 * DataErasureModal — DPDP Act 2023 Section 13 Right to Erasure (#60)
 *
 * Allows a logged-in student (or any user) to formally request deletion
 * of their personal data. The request is reviewed by the coordinator;
 * actual deletion requires principal approval per statutory safeguards.
 *
 * UI flow:
 *   1. Intro — explain what erasure means and its limitations
 *   2. Form  — reason textarea + submit
 *   3. Done  — confirmation with request ID and 30-day SLA
 *   Also: if a pending request already exists, show its status.
 */

import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const STATUS_META = {
  pending:   { label: 'Under Review',  color: '#D97706', bg: 'rgba(217,119,6,0.08)'   },
  approved:  { label: 'Approved',      color: '#16A34A', bg: 'rgba(22,163,74,0.08)'   },
  rejected:  { label: 'Not Approved',  color: '#DC2626', bg: 'rgba(220,38,38,0.08)'   },
  completed: { label: 'Completed',     color: '#6B7280', bg: 'rgba(107,114,128,0.08)' },
}

const MIN_REASON_LEN = 20

export default function DataErasureModal({ onClose }) {
  const [step, setStep]         = useState('loading') // loading | intro | form | done | existing
  const [reason, setReason]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [requests, setRequests] = useState([])
  const [result, setResult]     = useState(null)

  // Fetch any existing erasure requests on mount
  useEffect(() => {
    api.get('/api/auth/erasure-request')
      .then(res => {
        const reqs = res.data?.requests || []
        setRequests(reqs)
        const pending = reqs.find(r => r.status === 'pending')
        setStep(pending ? 'existing' : 'intro')
      })
      .catch(() => setStep('intro'))
  }, [])

  const handleSubmit = async () => {
    if (reason.trim().length < MIN_REASON_LEN) {
      toast.error(`Please write at least ${MIN_REASON_LEN} characters explaining your reason.`)
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post('/api/auth/erasure-request', { reason: reason.trim() })
      setResult(res.data)
      setStep('done')
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not submit request. Please try again.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#fff', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ background: '#1e3f18', padding: '20px 24px' }} className="flex items-start justify-between">
          <div>
            <p style={{ color: '#c9a84c', fontWeight: 900, fontSize: '18px', letterSpacing: '0.5px' }}>
              Data Erasure Request
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '2px' }}>
              Your rights under DPDP Act 2023 · Section 13
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ color: 'rgba(255,255,255,0.5)', fontSize: '22px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', marginLeft: '12px', flexShrink: 0, marginTop: '2px' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ padding: '24px' }}>

          {/* ── Loading ── */}
          {step === 'loading' && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-gray-200 rounded-full mx-auto animate-spin" style={{ borderTopColor: '#2d5c26' }} />
              <p className="text-sm text-gray-500 mt-3">Checking your request status…</p>
            </div>
          )}

          {/* ── Intro ── */}
          {step === 'intro' && (
            <>
              {/* What this means */}
              <div
                className="rounded-xl p-4 mb-4"
                style={{ background: 'rgba(45,92,38,0.05)', border: '1px solid rgba(45,92,38,0.12)' }}
              >
                <p className="font-bold text-sm mb-2" style={{ color: '#2d5c26' }}>
                  🔒 Your Right to Erasure
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Under the <strong>Digital Personal Data Protection Act 2023</strong>, you can request
                  deletion of your personal information from Vox DPSI. This request will be reviewed
                  by the school coordinator and principal.
                </p>
              </div>

              {/* What gets deleted */}
              <div className="rounded-xl p-4 mb-4" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <p className="font-bold text-xs uppercase tracking-wide text-gray-500 mb-3">What will be erased</p>
                <ul className="space-y-1.5">
                  {[
                    'Your name, email, phone number, and scholar number',
                    'Profile information associated with your account',
                    'Personal details in complaint descriptions',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-0.5 flex-shrink-0" style={{ color: '#16A34A' }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* What is retained */}
              <div
                className="rounded-xl p-4 mb-6"
                style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)' }}
              >
                <p className="font-bold text-xs uppercase tracking-wide mb-3" style={{ color: '#DC2626' }}>
                  What must be retained (by law)
                </p>
                <ul className="space-y-1.5">
                  {[
                    'Anonymised complaint records (required for school accountability)',
                    'Records related to ongoing disciplinary or POSH/POCSO proceedings',
                    'Audit logs required for legal or regulatory compliance',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="mt-0.5 flex-shrink-0" style={{ color: '#DC2626' }}>!</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                  Your personal identity will be removed from these records, but the anonymised complaint
                  data may be retained for institutional and legal purposes.
                </p>
              </div>

              {/* SLA note */}
              <div
                className="rounded-xl p-3 mb-6 flex items-start gap-3"
                style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)' }}
              >
                <span className="text-lg">⏱️</span>
                <p className="text-xs text-gray-600 leading-relaxed">
                  The school will review and respond to your request within <strong>30 days</strong>,
                  as required by the DPDP Act 2023. You will be contacted at your registered email address.
                </p>
              </div>

              {/* Previous requests (non-pending) */}
              {requests.length > 0 && (
                <div className="mb-5">
                  <p className="font-bold text-xs uppercase tracking-wide text-gray-500 mb-2">Previous Requests</p>
                  <div className="space-y-2">
                    {requests.map(r => {
                      const meta = STATUS_META[r.status] || STATUS_META.pending
                      return (
                        <div
                          key={r.id}
                          className="rounded-xl p-3 flex items-center justify-between"
                          style={{ background: meta.bg, border: `1px solid ${meta.color}33` }}
                        >
                          <div>
                            <p className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Submitted {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            {r.reviewer_note && (
                              <p className="text-xs text-gray-600 mt-1 italic">"{r.reviewer_note}"</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep('form')}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all"
                  style={{ background: 'linear-gradient(135deg,#2d5c26,#1e3f18)' }}
                >
                  Continue →
                </button>
              </div>
            </>
          )}

          {/* ── Form ── */}
          {step === 'form' && (
            <>
              <div
                className="rounded-xl p-3 mb-5 flex items-start gap-3"
                style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.2)' }}
              >
                <span className="text-lg flex-shrink-0">⚠️</span>
                <p className="text-xs text-gray-700 leading-relaxed">
                  This is a formal legal request. Please be specific about what information you want erased
                  and why. The coordinator will review your request and may contact you to clarify.
                </p>
              </div>

              <label className="block text-sm font-bold mb-2" style={{ color: '#2d5c26' }}>
                Reason for Erasure Request
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="Explain why you are requesting erasure of your data. For example: 'I am leaving the school and no longer need my account. I request deletion of my personal information including my name, email, and scholar number.'"
                className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none mb-1"
                style={{
                  border: `1px solid ${reason.length >= MIN_REASON_LEN ? '#2d5c26' : '#D1D5DB'}`,
                  background: 'rgba(255,255,255,0.8)',
                  lineHeight: '1.6',
                }}
                onFocus={e => e.target.style.borderColor = '#2d5c26'}
                onBlur={e => e.target.style.borderColor = reason.length >= MIN_REASON_LEN ? '#2d5c26' : '#D1D5DB'}
              />
              <div className="flex justify-between mb-5">
                <p className={`text-xs ${reason.length < MIN_REASON_LEN ? 'text-red-400' : 'text-green-600'}`}>
                  {reason.length < MIN_REASON_LEN
                    ? `${MIN_REASON_LEN - reason.length} more characters needed`
                    : '✓ Minimum length met'}
                </p>
                <p className="text-xs text-gray-400">{reason.length}/1000</p>
              </div>

              {/* Confirmation checkbox */}
              <div
                className="rounded-xl p-4 mb-6"
                style={{ background: 'rgba(45,92,38,0.04)', border: '1px solid rgba(45,92,38,0.1)' }}
              >
                <p className="text-xs text-gray-600 leading-relaxed">
                  By submitting this request, you understand that: (1) your request will be reviewed
                  within 30 days; (2) some data may be legally required to be retained in anonymised
                  form; (3) your account access will continue until the request is processed.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('intro')}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || reason.trim().length < MIN_REASON_LEN}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#2d5c26,#1e3f18)' }}
                >
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </>
          )}

          {/* ── Existing pending request ── */}
          {step === 'existing' && (
            <>
              {requests.filter(r => r.status === 'pending').map(r => (
                <div key={r.id}>
                  <div
                    className="rounded-xl p-4 mb-5 text-center"
                    style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.25)' }}
                  >
                    <p className="text-3xl mb-2">⏳</p>
                    <p className="font-bold" style={{ color: '#D97706' }}>Request Under Review</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="rounded-xl p-4 mb-5" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Your Reason</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{r.reason}</p>
                  </div>

                  <div
                    className="rounded-xl p-3 mb-6 flex items-start gap-3"
                    style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)' }}
                  >
                    <span className="text-base flex-shrink-0">ℹ️</span>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      The school coordinator is reviewing your request. You will be contacted at your
                      registered email within <strong>30 days</strong>. If you haven't heard back,
                      contact the school at{' '}
                      <a href="mailto:principal@dpsi.edu.in" style={{ color: '#2d5c26', fontWeight: 600 }}>
                        principal@dpsi.edu.in
                      </a>
                    </p>
                  </div>
                </div>
              ))}

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-bold text-sm text-white"
                style={{ background: 'linear-gradient(135deg,#2d5c26,#1e3f18)' }}
              >
                Close
              </button>
            </>
          )}

          {/* ── Done ── */}
          {step === 'done' && result && (
            <>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">✅</div>
                <h3 className="font-black text-xl" style={{ color: '#2d5c26' }}>Request Submitted</h3>
                <p className="text-sm text-gray-500 mt-1">Your erasure request has been logged</p>
              </div>

              <div
                className="rounded-xl p-4 mb-5"
                style={{ background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.2)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Request ID</p>
                  <p className="text-xs font-mono font-bold" style={{ color: '#2d5c26' }}>
                    {result.request_id?.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{result.message}</p>
              </div>

              <div className="rounded-xl p-4 mb-6" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Next Steps</p>
                <ul className="space-y-2">
                  {[
                    'A coordinator will review your request',
                    'You will be contacted by email within 30 days',
                    'You may be asked to confirm your identity',
                    'Approved requests will be processed by the principal',
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="font-bold flex-shrink-0" style={{ color: '#2d5c26' }}>{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-bold text-sm text-white"
                style={{ background: 'linear-gradient(135deg,#2d5c26,#1e3f18)' }}
              >
                Done
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
