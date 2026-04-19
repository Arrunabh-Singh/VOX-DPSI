import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ROLES } from '../utils/constants'
import { VoxWordmark } from './VoxLogo'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-50 shadow-lg" style={{ background: 'rgba(0,40,80,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="cursor-pointer" onClick={() => navigate('/')}>
          <VoxWordmark light size="sm" />
        </div>

        {/* User Info */}
        {user && (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-sm text-white leading-tight">{user.name}</p>
              <p className="text-xs font-medium" style={{ color: '#F0B429' }}>
                {ROLES[user.role] || user.role}
                {user.scholar_no && ` · ${user.scholar_no}`}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
