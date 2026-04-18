import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

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

  // Quick-fill demo accounts
  const demoAccounts = [
    { label: 'Student', email: '5001@student.dpsindore.org' },
    { label: 'Council', email: '5002@student.dpsindore.org' },
    { label: 'Teacher', email: 'sharma@staff.dpsindore.org' },
    { label: 'Coordinator', email: 'kapil@staff.dpsindore.org' },
    { label: 'Principal', email: 'principal@dpsindore.org' },
    { label: 'Supervisor', email: '5411@student.dpsindore.org' },
  ]

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      {/* Top accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-[#003366] via-[#FFD700] to-[#003366]" />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo card */}
          <div className="bg-[#003366] rounded-2xl shadow-2xl px-8 py-10 mb-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-full bg-[#FFD700] flex items-center justify-center shadow-lg">
                <span className="text-[#003366] font-black text-2xl">V</span>
              </div>
            </div>
            <h1 className="text-white font-black text-4xl tracking-tight">
              Vox <span className="text-[#FFD700]">DPSI</span>
            </h1>
            <p className="text-blue-200 text-sm mt-2 font-medium">
              Student Grievance Management System
            </p>
            <p className="text-blue-300 text-xs mt-1">Delhi Public School Indore</p>
          </div>

          {/* Login form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Sign in to your account</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@dpsi.com"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-transparent transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-transparent transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#003366] hover:bg-[#002952] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            {/* Demo quick-fill */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Demo Accounts</p>
              <div className="grid grid-cols-3 gap-1.5">
                {demoAccounts.map(a => (
                  <button
                    key={a.email}
                    onClick={() => { setEmail(a.email); setPassword('demo123') }}
                    className="text-xs py-1.5 px-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-600 font-medium transition-colors"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">All passwords: demo123</p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-400 text-xs mt-6">
            Powered by DPS Indore Student Council
          </p>
        </div>
      </div>
    </div>
  )
}
