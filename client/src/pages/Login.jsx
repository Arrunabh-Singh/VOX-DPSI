import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { VoxMark } from '../components/VoxLogo'

const demoAccounts = [
  { label: 'Student',     email: '5001@student.dpsindore.org' },
  { label: 'Council',     email: '5002@student.dpsindore.org' },
  { label: 'Teacher',     email: 'sharma@staff.dpsindore.org' },
  { label: 'Coordinator', email: 'kapil@staff.dpsindore.org' },
  { label: 'Principal',   email: 'principal@dpsindore.org' },
  { label: 'Supervisor',  email: '5411@student.dpsindore.org' },
]

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const { login }   = useAuth()
  const navigate    = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Please enter email and password')
    setLoading(true)
    try {
      const user = await login(email, password)
      toast.success(`Welcome back, ${user.name}!`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen login-bg flex flex-col">
      {/* Gold accent bar */}
      <div className="h-1" style={{ background: 'linear-gradient(90deg,#C9920A,#F0B429,#C9920A)' }} />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Hero branding */}
          <div className="text-center mb-8">
            {/* DPS Logo + VOX mark side by side */}
            <div className="flex items-center justify-center gap-5 mb-5">
              <img src="/assets/dps-logo.png" alt="DPS Indore" className="h-16 w-auto drop-shadow-lg" />
              <div className="w-px h-12 bg-white/20" />
              <VoxMark size={52} />
            </div>
            <h1 className="text-white font-black text-4xl tracking-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
              VOX <span style={{ color: '#F0B429' }}>DPSI</span>
            </h1>
            <p className="mt-2 text-sm font-medium" style={{ color: '#A7C4B0' }}>Student Grievance Management System</p>
            <p className="text-xs mt-1" style={{ color: '#6B9E7E' }}>Delhi Public School Indore</p>
          </div>

          {/* Login card — frosted glass */}
          <div className="glass-modal rounded-2xl p-8">
            <h2 className="text-lg font-bold mb-5" style={{ color: '#1B4D2B' }}>Sign in to your account</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@dpsindore.org"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  style={{ border: '1.5px solid #D1FAE5', background: 'rgba(255,255,255,0.7)' }}
                  onFocus={e => e.target.style.borderColor = '#1B4D2B'}
                  onBlur={e => e.target.style.borderColor = '#D1FAE5'}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  style={{ border: '1.5px solid #D1FAE5', background: 'rgba(255,255,255,0.7)' }}
                  onFocus={e => e.target.style.borderColor = '#1B4D2B'}
                  onBlur={e => e.target.style.borderColor = '#D1FAE5'}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                style={{ background: 'linear-gradient(135deg,#1B4D2B,#2A6B3F)', boxShadow: '0 4px 16px rgba(27,77,43,0.3)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 pt-5" style={{ borderTop: '1px solid #E5E7EB' }}>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Demo Accounts</p>
              <div className="grid grid-cols-3 gap-1.5">
                {demoAccounts.map(a => (
                  <button
                    key={a.email}
                    onClick={() => { setEmail(a.email); setPassword('demo123') }}
                    className="text-xs py-1.5 px-2 rounded-lg font-medium transition-colors"
                    style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#DCFCE7'}
                    onMouseLeave={e => e.currentTarget.style.background = '#F0FDF4'}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">All passwords: demo123</p>
            </div>
          </div>

          <p className="text-center text-xs mt-6" style={{ color: '#4A7C5C' }}>
            Powered by DPS Indore Student Council
          </p>
        </div>
      </div>
    </div>
  )
}
