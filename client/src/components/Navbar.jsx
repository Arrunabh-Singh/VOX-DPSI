import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ROLES } from '../utils/constants'
import { VoxWordmark } from './VoxLogo'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(45,92,38,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(201,168,76,0.22)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="cursor-pointer" onClick={() => navigate('/')}>
          <VoxWordmark light size="sm" />
        </div>

        {/* Right side */}
        {user && (
          <div className="flex items-center gap-3">
            <NotificationBell />

            {/* Alpha Badge — VIP gold */}
            <span style={{
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.5)',
              color: '#c9a84c',
              fontSize: '10px',
              fontWeight: '700',
              padding: '2px 9px',
              borderRadius: '20px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              α Beta
            </span>

            {/* User Info */}
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-sm text-white leading-tight">{user.name}</p>
              <p className="text-xs font-medium" style={{ color: '#c9a84c' }}>
                {ROLES[user.role] || user.role}
                {user.scholar_no && ` · ${user.scholar_no}`}
              </p>
            </div>

            {/* Sign out */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)' }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
