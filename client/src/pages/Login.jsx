import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import toast from 'react-hot-toast'

const demoAccounts = [
  { label: 'Student',     name: 'Rahul Sharma',          email: 'student@dpsi.com',           color: '#2563EB' },
  { label: 'Council',     name: 'Priya Verma',           email: 'council@dpsi.com',           color: '#16A34A' },
  { label: 'Teacher',     name: 'Mrs. Sharma',           email: 'teacher@dpsi.com',           color: '#7C3AED' },
  { label: 'Coordinator', name: 'Mr. Kapil',             email: 'coordinator@dpsi.com',       color: '#EA580C' },
  { label: 'Principal',   name: 'Mr. Parminder Chopra',  email: 'principal@dpsi.com',         color: '#c9a84c' },
  { label: 'Supervisor',  name: 'Arrunabh Singh',        email: 'supervisor@dpsi.com',        color: '#2d5c26' },
]

const NAV   = '#2d5c26'
const GOLD  = '#c9a84c'
const BG    = '#eae1c4'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const { lang, toggleLang, t } = useLanguage()

  useEffect(() => { document.title = 'Vox DPSI | DPS Indore' }, [])

  const doLogin = async (e, emailOverride, passOverride) => {
    if (e) e.preventDefault()
    const finalEmail = emailOverride || email
    const finalPass  = passOverride  || password
    if (!finalEmail || !finalPass) return toast.error('Please enter email and password')
    setLoading(true)
    try {
      const user = await login(finalEmail, finalPass)
      toast.success(`Welcome, ${user.name}!`)
      navigate('/')
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

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, #1a2e16 0%, ${NAV} 45%, #1e3f18 100%)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative background circles */}
      <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(201,168,76,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(234,225,196,0.05)', pointerEvents: 'none' }} />

      {/* Hero Logo */}
      <div style={{ textAlign: 'center', marginBottom: '36px', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
          <span style={{ fontSize: '64px', fontWeight: '900', color: '#fff', letterSpacing: '-2px', lineHeight: 1 }}>VOX</span>
          <span style={{ fontSize: '64px', fontWeight: '900', color: GOLD, letterSpacing: '-2px', lineHeight: 1 }}>DPSI</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontStyle: 'italic', margin: '0 0 12px 0', letterSpacing: '0.06em' }}>
          {t('common.tagline')}
        </p>
        {/* Language toggle on login page */}
        <button
          onClick={toggleLang}
          style={{ background: 'rgba(201,168,76,0.18)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '8px', color: GOLD, fontSize: '12px', fontWeight: '700', padding: '4px 12px', cursor: 'pointer', letterSpacing: '0.06em', marginBottom: '16px' }}
        >
          {lang === 'en' ? 'हिंदी में देखें' : 'View in English'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
          <div style={{ height: '1px', width: '50px', background: `rgba(201,168,76,0.4)` }} />
          <span style={{ fontSize: '10px', color: 'rgba(201,168,76,0.7)', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Safe · Confidential · Supported</span>
          <div style={{ height: '1px', width: '50px', background: `rgba(201,168,76,0.4)` }} />
        </div>
      </div>

      {/* Login Card */}
      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        <div style={{
          background: BG,
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
          border: '1px solid rgba(201,168,76,0.2)',
          marginBottom: '16px',
        }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700', color: '#1a1a1a' }}>
            {t('auth.loginSubtitle')}
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#6B7280' }}>
            {t('common.poweredBy')}
          </p>

          <form onSubmit={doLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', color: '#555', fontSize: '12px', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {t('auth.email')}
              </label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@dpsindore.org"
                required
                style={{ width: '100%', background: '#fff', border: '1px solid rgba(45,92,38,0.25)', borderRadius: '10px', padding: '12px 14px', color: '#1a1a1a', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = NAV}
                onBlur={e => e.target.style.borderColor = 'rgba(45,92,38,0.25)'}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', color: '#555', fontSize: '12px', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {t('auth.password')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{ width: '100%', background: '#fff', border: '1px solid rgba(45,92,38,0.25)', borderRadius: '10px', padding: '12px 46px 12px 14px', color: '#1a1a1a', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = NAV}
                  onBlur={e => e.target.style.borderColor = 'rgba(45,92,38,0.25)'}
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', padding: 0, color: '#777' }}
                  aria-label={showPass ? 'Hide' : 'Show'}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Sign In */}
            <button
              type="submit" disabled={loading}
              style={{ background: loading ? '#888' : NAV, color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px', transition: 'background 0.2s' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1e3f18' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = NAV }}
            >
              {loading ? (
                <><span style={{ width: '16px', height: '16px', border: '2.5px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> {t('auth.loggingIn')}</>
              ) : `${t('auth.login')} →`}
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
                style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderLeft: `3px solid ${acc.color}`, borderRadius: '8px', padding: '9px 12px', cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'background 0.12s', opacity: loading ? 0.6 : 1 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              >
                <div style={{ color: '#fff', fontSize: '12px', fontWeight: '600', lineHeight: 1.2 }}>{acc.label}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', marginTop: '2px' }}>{acc.name}</div>
              </button>
            ))}
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', textAlign: 'center', marginTop: '20px' }}>
          A safe space to speak up · Built by the Student Council, DPS Indore
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
