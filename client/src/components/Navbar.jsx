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
    <header className="sticky top-0 z-50 shadow-lg" style={{ background: 'rgba(0,51,102,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,215,0,0.15)' }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="cursor-pointer" onClick={() => navigate('/')}>
          <VoxWordmark light size="sm" />
        </div>

        {/* Right side */}
        {user && (
          <div className="flex items-center gap-3">
            {/* Alpha Badge */}
            <span style={{
              background: '#1a1a1a',
              border: '0.5px solid #FFD700',
              color: '#FFD700',
              fontSize: '10px',
              fontWeight: '600',
              padding: '2px 8px',
              borderRadius: '20px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Alpha v0.1
            </span>

            {/* User Info */}
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-sm text-white leading-tight">{user.name}</p>
              <p className="text-xs font-medium" style={{ color: '#FFD700' }}>
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
