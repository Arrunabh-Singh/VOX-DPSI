import { useState } from 'react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

/**
 * PrivacyNoticeGate
 *
 * DPDP Act 2023 — Section 9 (children's data) + Section 7 (consent notice)
 *
 * Any logged-in user who has not yet acknowledged the privacy notice is
 * blocked from the rest of the app until they read and accept it. The
 * acknowledgement is written to the DB via PATCH /api/users/me and to
 * the user object in AuthContext so the gate doesn't re-fire this session.
 */
export default function PrivacyNoticeGate({ children }) {
  const { user, setUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)

  // Already acknowledged — pass through immediately
  if (!user || user.is_privacy_acknowledged) return children

  const handleScroll = (e) => {
    const el = e.target
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 10
    if (atBottom) setScrolledToBottom(true)
  }

  const handleAccept = async () => {
    setLoading(true)
    try {
      await api.patch('/api/users/me', { is_privacy_acknowledged: true })
      // Update local user state so gate doesn't re-fire without a page reload
      setUser(prev => ({ ...prev, is_privacy_acknowledged: true }))
      toast.success('Privacy notice acknowledged. Welcome to Vox DPSI!')
    } catch {
      toast.error('Could not save your consent. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#fff', borderRadius: '20px', maxWidth: '560px', width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column', maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(135deg,#003366,#005599)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', flexShrink: 0,
            }}>🔒</div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#003366', margin: 0 }}>
                Privacy Notice — Vox DPSI
              </h2>
              <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0' }}>
                Delhi Public School Indore · Student Grievance System
              </p>
            </div>
          </div>
          <div style={{ background: '#FEF9EC', border: '1px solid #FDE68A', borderRadius: '8px', padding: '8px 12px', marginTop: '8px' }}>
            <p style={{ fontSize: '12px', color: '#92400E', margin: 0, fontWeight: '600' }}>
              📜 Please read this notice and scroll to the bottom before proceeding.
            </p>
          </div>
        </div>

        {/* Scrollable body */}
        <div
          onScroll={handleScroll}
          style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', fontSize: '13px', lineHeight: '1.7', color: '#374151' }}
        >
          <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#003366', marginBottom: '6px' }}>What we collect</h3>
          <p style={{ marginBottom: '12px' }}>
            When you raise a complaint, Vox DPSI collects your <strong>name, scholar number, section, and the details you provide</strong>
            in your complaint (including any attachments). This information is used solely to investigate and resolve your grievance.
          </p>

          <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#003366', marginBottom: '6px' }}>Who sees your data</h3>
          <p style={{ marginBottom: '12px' }}>
            Your complaint details are only visible to authorised council members and school staff.
            If you request anonymity, your identity is hidden from all staff above council level
            unless you or your council member consents to reveal it. Complaints about sexual harassment
            are routed directly to the Internal Committee — no student council member sees them.
          </p>

          <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#003366', marginBottom: '6px' }}>Your rights under the DPDP Act 2023</h3>
          <p style={{ marginBottom: '12px' }}>
            Under India's <strong>Digital Personal Data Protection Act 2023</strong>, you have the right to:
          </p>
          <ul style={{ paddingLeft: '18px', marginBottom: '12px' }}>
            <li>Access a summary of your personal data held by the school</li>
            <li>Request correction of inaccurate information</li>
            <li>Request erasure of your data (subject to statutory retention obligations)</li>
            <li>Nominate a parent or guardian as your data fiduciary representative</li>
          </ul>
          <p style={{ marginBottom: '12px' }}>
            To exercise these rights, contact your class coordinator or email the school administration.
          </p>

          <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#003366', marginBottom: '6px' }}>Data retention</h3>
          <p style={{ marginBottom: '12px' }}>
            Resolved complaints are retained for a minimum of <strong>2 years</strong> as required by school grievance policy.
            Complaint records linked to POSH/POCSO proceedings may be retained for longer as directed by the Internal Committee.
          </p>

          <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#003366', marginBottom: '6px' }}>Security</h3>
          <p style={{ marginBottom: '12px' }}>
            All data is encrypted in transit (HTTPS) and at rest. Access is controlled by role-based authentication.
            Uploaded images are stripped of EXIF metadata (including location data) before storage.
          </p>

          <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#003366', marginBottom: '6px' }}>Contact</h3>
          <p style={{ marginBottom: '20px' }}>
            If you have questions about how your data is handled, please speak to your class teacher
            or contact the school office directly.
          </p>

          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
            <p style={{ fontSize: '12px', color: '#166534', margin: 0 }}>
              ✅ By clicking "I Understand &amp; Accept", you confirm that you have read this notice
              and consent to the processing of your personal data as described above.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px 24px', borderTop: '1px solid #F3F4F6' }}>
          {!scrolledToBottom && (
            <p style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'center', marginBottom: '8px' }}>
              ↓ Scroll to the bottom to enable the accept button
            </p>
          )}
          <button
            onClick={handleAccept}
            disabled={!scrolledToBottom || loading}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px',
              background: scrolledToBottom ? 'linear-gradient(135deg,#003366,#005599)' : '#D1D5DB',
              color: scrolledToBottom ? '#FFD700' : '#9CA3AF',
              border: 'none', fontWeight: '800', fontSize: '15px',
              cursor: scrolledToBottom && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,215,0,0.3)', borderTopColor: '#FFD700', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                Saving...
              </span>
            ) : 'I Understand & Accept'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
