/**
 * VpcGate — Verifiable Parental Consent gate (DPDP Act 2023, Section 9)
 *
 * Displayed to students who have not yet obtained parental consent.
 * Renders in place of the dashboard until vpc_status === 'granted'.
 *
 * Flow:
 *  1. Show introduction + parent email form
 *  2. POST /api/auth/vpc-request → saves token, sends email
 *  3. "Awaiting consent" view — polls /api/auth/vpc-status every 10 s
 *  4. On grant → update user in AuthContext → gate lifts, dashboard shown
 *  5. In dev, show clickable grant link from API response for easy testing
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

// ── Inline spinner ────────────────────────────────────────────────────────────
function Spin({ size = 18, color = '#FFD700' }) {
  return (
    <span style={{
      display: 'inline-block',
      width: size, height: size,
      border: `3px solid ${color}33`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'vpcSpin 0.75s linear infinite',
      verticalAlign: 'middle',
      flexShrink: 0,
    }} />
  )
}

// ── Status badge colors ───────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:  { bg: '#FEF9EC', border: '#FDE68A', text: '#92400E', label: '⏳ Awaiting Consent' },
  declined: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', label: '✕  Consent Declined' },
  expired:  { bg: '#F3F4F6', border: '#D1D5DB', text: '#6B7280', label: '⏰ Link Expired'      },
  granted:  { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', label: '✅ Consent Granted'   },
}

export default function VpcGate({ children }) {
  const { user, setUser } = useAuth()

  // ── Determine if gate should be active ───────────────────────────────────
  // Only blocks students with vpc_status NOT in ['granted', 'not_required']
  const needsVpc = user?.role === 'student' &&
    !['granted', 'not_required'].includes(user?.vpc_status)

  // ── Local state ───────────────────────────────────────────────────────────
  const [parentEmail, setParentEmail]   = useState('')
  const [emailError,  setEmailError]    = useState('')
  const [submitting,  setSubmitting]    = useState(false)
  const [sentStatus,  setSentStatus]    = useState(null)   // API response after submit
  const [vpcStatus,   setVpcStatus]     = useState(user?.vpc_status || 'pending')
  const [polling,     setPolling]       = useState(false)
  const [devGrantUrl, setDevGrantUrl]   = useState(null)
  const pollingRef = useRef(null)

  // ── Poll for consent status ───────────────────────────────────────────────
  const pollStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/vpc-status')
      setVpcStatus(data.vpc_status)
      if (data.vpc_status === 'granted') {
        setUser(prev => ({ ...prev, vpc_status: 'granted' }))
        toast.success('✅ Parental consent received! Welcome to Vox DPSI.')
        if (pollingRef.current) clearInterval(pollingRef.current)
      }
      if (['declined', 'expired'].includes(data.vpc_status)) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setPolling(false)
      }
    } catch {
      // Silent — don't spam error toasts while polling
    }
  }, [setUser])

  // Start polling once we have a sent email
  useEffect(() => {
    if (!sentStatus || !needsVpc) return
    if (['granted', 'not_required', 'declined'].includes(vpcStatus)) return

    setPolling(true)
    pollingRef.current = setInterval(pollStatus, 10_000)
    return () => clearInterval(pollingRef.current)
  }, [sentStatus, needsVpc, vpcStatus, pollStatus])

  // If we're re-entering this gate already in pending state (e.g. page refresh),
  // start polling immediately without re-submitting
  useEffect(() => {
    if (!needsVpc) return
    if (user?.vpc_status === 'pending' && !sentStatus) {
      setSentStatus({ status: 'email_sent', existingPending: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Gate bypass — not a student / already granted ─────────────────────────
  if (!needsVpc) return children

  // ── Handle submit ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(parentEmail)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailError('')
    setSubmitting(true)
    try {
      const { data } = await api.post('/api/auth/vpc-request', { parent_email: parentEmail })
      setSentStatus(data)
      setVpcStatus('pending')
      if (data.dev_grant_url) setDevGrantUrl(data.dev_grant_url)
      toast.success('Consent email sent to your parent!')
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send consent email. Please try again.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const st = STATUS_STYLES[vpcStatus] || STATUS_STYLES.pending

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #001f3f 0%, #003366 50%, #004080 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      <div
        style={{
          background: '#fff', borderRadius: '24px', maxWidth: '520px', width: '100%',
          boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#003366,#005599)', padding: '28px 32px 24px' }}>
          <p style={{ color: '#FFD700', fontWeight: '900', fontSize: '22px', letterSpacing: '1px', margin: '0 0 4px' }}>
            VOX DPSI
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', margin: 0 }}>
            Delhi Public School Indore · Student Grievance System
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 32px' }}>

          {/* Icon + heading */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#003366', margin: '0 0 8px' }}>
              Parental Consent Required
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, lineHeight: '1.6' }}>
              Under the <strong>Digital Personal Data Protection Act 2023 (Section 9)</strong>,
              we need a parent or guardian's consent before you can use this platform.
            </p>
          </div>

          {/* Info box */}
          <div style={{
            background: '#EFF6FF', border: '1px solid #BFDBFE',
            borderRadius: '10px', padding: '14px 16px', marginBottom: '24px',
          }}>
            <p style={{ fontSize: '12px', color: '#1E40AF', fontWeight: '700', margin: '0 0 6px' }}>
              What happens next?
            </p>
            <ul style={{ fontSize: '12px', color: '#1D4ED8', lineHeight: '1.8', margin: 0, paddingLeft: '18px' }}>
              <li>We send a consent email to your parent or guardian</li>
              <li>They click "I Give Consent" in the email</li>
              <li>This page updates automatically — no need to reload</li>
              <li>Your privacy is protected throughout</li>
            </ul>
          </div>

          {/* ── AWAITING STATE ─────────────────────────────────────────── */}
          {sentStatus && vpcStatus !== 'granted' && (
            <>
              {/* Status badge */}
              <div style={{
                background: st.bg, border: `1px solid ${st.border}`,
                borderRadius: '10px', padding: '14px 16px', marginBottom: '20px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                {polling && <Spin size={18} color={st.text} />}
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: st.text, margin: '0 0 2px' }}>
                    {st.label}
                  </p>
                  {vpcStatus === 'pending' && (
                    <p style={{ fontSize: '12px', color: st.text, margin: 0, opacity: 0.8 }}>
                      Checking every 10 seconds…
                    </p>
                  )}
                  {vpcStatus === 'declined' && (
                    <p style={{ fontSize: '12px', color: st.text, margin: 0, opacity: 0.8 }}>
                      Your parent has declined consent. Please contact your coordinator to proceed.
                    </p>
                  )}
                  {vpcStatus === 'expired' && (
                    <p style={{ fontSize: '12px', color: st.text, margin: 0, opacity: 0.8 }}>
                      The link expired. Submit again below to send a new email.
                    </p>
                  )}
                </div>
              </div>

              {/* Dev grant URL (non-production only) */}
              {devGrantUrl && (
                <div style={{
                  background: '#FFFBEB', border: '1px solid #FCD34D',
                  borderRadius: '10px', padding: '12px 14px', marginBottom: '20px',
                }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#92400E', margin: '0 0 4px' }}>
                    🛠 DEV MODE — Click to simulate parent consent:
                  </p>
                  <a
                    href={devGrantUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '11px', color: '#003366',
                      wordBreak: 'break-all', fontFamily: 'monospace',
                    }}
                  >
                    {devGrantUrl}
                  </a>
                </div>
              )}

              {/* Re-send / change email */}
              {['expired', 'declined'].includes(vpcStatus) && (
                <button
                  onClick={() => { setSentStatus(null); setVpcStatus(user?.vpc_status || 'pending') }}
                  style={{
                    width: '100%', padding: '13px', borderRadius: '12px',
                    border: '2px solid #003366', background: 'transparent',
                    color: '#003366', fontWeight: '700', fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  ✉️ Send New Consent Email
                </button>
              )}
            </>
          )}

          {/* ── EMAIL FORM ─────────────────────────────────────────────── */}
          {(!sentStatus || ['expired', 'declined'].includes(vpcStatus)) && (
            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                Parent / Guardian Email Address
              </label>
              <input
                type="email"
                value={parentEmail}
                onChange={e => { setParentEmail(e.target.value); setEmailError('') }}
                placeholder="parent@example.com"
                required
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px', fontSize: '14px',
                  border: emailError ? '1.5px solid #DC2626' : '1.5px solid #D1D5DB',
                  outline: 'none', color: '#1A1A1A', boxSizing: 'border-box', marginBottom: '4px',
                }}
              />
              {emailError && (
                <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0' }}>{emailError}</p>
              )}

              <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '8px 0 20px', lineHeight: '1.5' }}>
                We will send a single consent email. We will never spam or market to this address.
                The link expires in <strong>72 hours</strong>.
              </p>

              <button
                type="submit"
                disabled={submitting || !parentEmail}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  background: submitting || !parentEmail ? '#D1D5DB' : 'linear-gradient(135deg,#003366,#005599)',
                  color: submitting || !parentEmail ? '#9CA3AF' : '#FFD700',
                  border: 'none', fontWeight: '800', fontSize: '15px',
                  cursor: submitting || !parentEmail ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  transition: 'all 0.2s',
                }}
              >
                {submitting ? (
                  <><Spin size={18} color="#FFD700" /> Sending…</>
                ) : '📧 Send Consent Email'}
              </button>
            </form>
          )}

          {/* Already in pending (page refresh) and no re-submit form shown */}
          {sentStatus?.existingPending && !['expired', 'declined'].includes(vpcStatus) && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                onClick={() => { setSentStatus(null) }}
                style={{
                  background: 'none', border: 'none', color: '#6B7280',
                  fontSize: '12px', cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                Use a different email address
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          background: '#F9FAFB', borderTop: '1px solid #F3F4F6',
          padding: '14px 32px', textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0, lineHeight: '1.5' }}>
            Questions? Contact the school at{' '}
            <a href="mailto:principal@dpsi.edu.in" style={{ color: '#003366' }}>
              principal@dpsi.edu.in
            </a>
          </p>
        </div>
      </div>

      <style>{`@keyframes vpcSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
