import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import api from '../utils/api'
import toast from 'react-hot-toast'

const demoAccounts = [
  { label: 'Student',     name: 'Rahul Sharma',          email: 'student@dpsi.com',           color: '#2563EB' },
  { label: 'Council',     name: 'Priya Verma',           email: 'council@dpsi.com',           color: '#16A34A' },
  { label: 'Teacher',     name: 'Mrs. Sharma',           email: 'teacher@dpsi.com',           color: '#7C3AED' },
  { label: 'Coordinator', name: 'Mr. Kapil',             email: 'coordinator@dpsi.com',       color: '#EA580C' },
  { label: 'Principal',   name: 'Mr. Parminder Chopra',  email: 'principal@dpsi.com',         color: '#c9a84c' },
  { label: 'Supervisor',  name: 'Arrunabh Singh',        email: 'supervisor@dpsi.com',        color: '#2d5c26' },
]

const NAV  = '#2d5c26'
const GOLD = '#c9a84c'
const BG   = '#eae1c4'

export default function Login() {
  // Step 1 state
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  // Step 2 (OTP) state
  const [step, setStep]             = useState(1)    // 1 = credentials, 2 = OTP
  const [sessionId, setSessionId]   = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [devOtp, setDevOtp]         = useState('')   // shown when SMTP not configured
  const [otp, setOtp]               = useState(['', '', '', '', '', ''])
  const [otpLoading, setOtpLoading] = useState(false)
  const [resending, setResending]   = useState(false)
  const [countdown, setCountdown]   = useState(0)    // resend cooldown

  const otpRefs = useRef([])
  const { loginWithCookie } = useAuth()
  const navigate            = useNavigate()
  const { lang, toggleLang, t } = useLanguage()

  useEffect(() => { document.title = 'Vox DPSI | DPS Indore' }, [])

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown <= 0) return
    const id = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown])

  // ── Step 1: submit credentials ───────────────────────────────────────────────
  const doLogin = async (e, emailOverride, passOverride) => {
    if (e) e.preventDefault()
    const finalEmail = emailOverride || email
    const finalPass  = passOverride  || password
    if (!finalEmail || !finalPass) return toast.error('Please enter email and password')
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/login', { email: finalEmail, password: finalPass })

      if (data.requiresOtp) {
        setSessionId(data.sessionId)
        setMaskedEmail(data.maskedEmail)
        setDevOtp(data.devOtp || '')
        setStep(2)
        setCountdown(30) // 30 second resend cooldown
        if (!data.devOtp) toast.success(`OTP sent to ${data.maskedEmail}`)
      } else {
        // Shouldn't happen, but handle gracefully
        navigate('/')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (acc) => {
    setEmail(acc.email)
    setPassword('demo123')
    doLogin(null, acc.email, 'demo123')
  }

  // ── Step 2: OTP digit input ──────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1) // only keep last digit
    setOtp(newOtp)
    // Auto-advance
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
    // Auto-submit when all 6 filled
    if (value && index === 5) {
      const filled = [...newOtp.slice(0, 5), value.slice(-1)]
      if (filled.every(d => d)) submitOtp(filled.join(''))
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter') submitOtp(otp.join(''))
  }

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const digits = pasted.split('')
      setOtp(digits)
      otpRefs.current[5]?.focus()
      setTimeout(() => submitOtp(pasted), 0)
    }
    e.preventDefault()
  }

  const submitOtp = async (otpStr) => {
    const code = otpStr || otp.join('')
    if (code.length !== 6) return toast.error('Enter all 6 digits')
    setOtpLoading(true)
    try {
      const { data } = await api.post('/api/auth/verify-login-otp', { sessionId, otp: code })
      toast.success(`Welcome, ${data.user.name}!`)
      // Auth context should pick up the cookie on next /me call
      if (loginWithCookie) await loginWithCookie()
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.error || 'Incorrect OTP'
      toast.error(msg)
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setOtpLoading(false)
    }
  }

  const resendOtp = async () => {
    if (countdown > 0) return
    setResending(true)
    try {
      const { data } = await api.post('/api/auth/resend-login-otp', { sessionId })
      setDevOtp(data.devOtp || '')
      setCountdown(30)
      if (!data.devOtp) toast.success('New OTP sent!')
      else toast.success('OTP regenerated')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } catch (err) {
      toast.error('Failed to resend OTP. Please log in again.')
      setStep(1)
    } finally {
      setResending(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, #1a2e16 0%, ${NAV} 45%, #1e3f18 100%)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(201,168,76,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(234,225,196,0.05)', pointerEvents: 'none' }} />

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '36px', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
          <span style={{ fontSize: '64px', fontWeight: '900', color: '#fff', letterSpacing: '-2px', lineHeight: 1 }}>VOX</span>
          <span style={{ fontSize: '64px', fontWeight: '900', color: GOLD, letterSpacing: '-2px', lineHeight: 1 }}>DPSI</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontStyle: 'italic', margin: '0 0 12px 0', letterSpacing: '0.06em' }}>
          {t('common.tagline')}
        </p>
        <button
          onClick={toggleLang}
          style={{ background: 'rgba(201,168,76,0.18)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '8px', color: GOLD, fontSize: '12px', fontWeight: '700', padding: '4px 12px', cursor: 'pointer', letterSpacing: '0.06em', marginBottom: '16px' }}
        >
          {lang === 'en' ? 'हिंदी में देखें' : 'View in English'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
          <div style={{ height: '1px', width: '50px', background: 'rgba(201,168,76,0.4)' }} />
          <span style={{ fontSize: '10px', color: 'rgba(201,168,76,0.7)', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Safe · Confidential · Supported</span>
          <div style={{ height: '1px', width: '50px', background: 'rgba(201,168,76,0.4)' }} />
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>

        {/* ── Step 1: Credentials ── */}
        {step === 1 && (
          <>
            <div style={{
              background: BG, borderRadius: '20px', padding: '28px',
              boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
              border: '1px solid rgba(201,168,76,0.2)', marginBottom: '16px',
            }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700', color: '#1a1a1a' }}>
                {t('auth.loginSubtitle')}
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#6B7280' }}>
                {t('common.poweredBy')}
              </p>

              <form onSubmit={doLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', color: '#555', fontSize: '12px', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {t('auth.email')}
                  </label>
                  <input
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@dpsindore.org" required
                    style={{ width: '100%', background: '#fff', border: '1px solid rgba(45,92,38,0.25)', borderRadius: '10px', padding: '12px 14px', color: '#1a1a1a', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = NAV}
                    onBlur={e => e.target.style.borderColor = 'rgba(45,92,38,0.25)'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#555', fontSize: '12px', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {t('auth.password')}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" required
                      style={{ width: '100%', background: '#fff', border: '1px solid rgba(45,92,38,0.25)', borderRadius: '10px', padding: '12px 46px 12px 14px', color: '#1a1a1a', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = NAV}
                      onBlur={e => e.target.style.borderColor = 'rgba(45,92,38,0.25)'}
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', padding: 0, color: '#777' }}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit" disabled={loading}
                  style={{ background: loading ? '#888' : NAV, color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1e3f18' }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.background = NAV }}
                >
                  {loading ? (
                    <><span style={{ width: '16px', height: '16px', border: '2.5px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> {t('auth.loggingIn')}</>
                  ) : 'Continue →'}
                </button>
              </form>
            </div>

            {/* Quick Login */}
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px', textAlign: 'center', margin: '0 0 10px 0' }}>
                Demo Quick Login — password: demo123
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                {demoAccounts.map(acc => (
                  <button
                    key={acc.email} onClick={() => quickLogin(acc)} disabled={loading}
                    style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderLeft: `3px solid ${acc.color}`, borderRadius: '8px', padding: '9px 12px', cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: loading ? 0.6 : 1 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                  >
                    <div style={{ color: '#fff', fontSize: '12px', fontWeight: '600', lineHeight: 1.2 }}>{acc.label}</div>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', marginTop: '2px' }}>{acc.name}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: OTP Entry ── */}
        {step === 2 && (
          <div style={{
            background: BG, borderRadius: '20px', padding: '32px 28px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
            border: '1px solid rgba(201,168,76,0.2)',
          }}>
            {/* Back */}
            <button
              onClick={() => { setStep(1); setOtp(['','','','','','']); setDevOtp('') }}
              style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              ← Back
            </button>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📧</div>
              <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700', color: '#1a1a1a' }}>
                Check your email
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>
                We sent a 6-digit code to <strong>{maskedEmail}</strong>
              </p>
            </div>

            {/* Dev mode banner */}
            {devOtp && (
              <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: '700', color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  ⚠️ Dev Mode — SMTP not configured
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: '#92400E' }}>
                  Your OTP is: <strong style={{ fontFamily: 'monospace', fontSize: '20px', letterSpacing: '4px' }}>{devOtp}</strong>
                </p>
              </div>
            )}

            {/* OTP boxes */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '24px' }}
              onPaste={handleOtpPaste}
            >
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  type="text" inputMode="numeric" pattern="\d*"
                  maxLength={1} value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                  style={{
                    width: '48px', height: '56px',
                    textAlign: 'center',
                    fontSize: '24px', fontWeight: '700', fontFamily: 'monospace',
                    background: digit ? '#F0FDF4' : '#fff',
                    border: `2px solid ${digit ? NAV : 'rgba(45,92,38,0.25)'}`,
                    borderRadius: '12px', outline: 'none',
                    transition: 'border-color 0.15s, background 0.15s',
                    color: '#1a1a1a',
                  }}
                  onFocus={e => e.target.style.borderColor = NAV}
                  onBlur={e => e.target.style.borderColor = digit ? NAV : 'rgba(45,92,38,0.25)'}
                />
              ))}
            </div>

            {/* Verify button */}
            <button
              onClick={() => submitOtp()}
              disabled={otpLoading || otp.join('').length < 6}
              style={{
                width: '100%', background: otpLoading || otp.join('').length < 6 ? '#888' : NAV,
                color: '#fff', border: 'none', borderRadius: '10px', padding: '13px',
                fontSize: '15px', fontWeight: '700',
                cursor: otpLoading || otp.join('').length < 6 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                marginBottom: '16px',
              }}
            >
              {otpLoading ? (
                <><span style={{ width: '16px', height: '16px', border: '2.5px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Verifying...</>
              ) : 'Verify & Sign In →'}
            </button>

            {/* Resend */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#6B7280' }}>
                Didn't get the code?
              </p>
              <button
                onClick={resendOtp}
                disabled={countdown > 0 || resending}
                style={{ background: 'none', border: 'none', color: countdown > 0 ? '#9CA3AF' : NAV, fontSize: '13px', fontWeight: '600', cursor: countdown > 0 ? 'not-allowed' : 'pointer', padding: 0 }}
              >
                {resending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
              </button>
            </div>
          </div>
        )}

        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', textAlign: 'center', marginTop: '20px' }}>
          A safe space to speak up · Built by the Student Council, DPS Indore
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
