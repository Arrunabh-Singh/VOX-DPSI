import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ROLES, VOX_O6_TITLES } from '../utils/constants'
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
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />


            {/* User Info — hidden on mobile, visible sm+ */}
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-sm text-white leading-tight">{user.name}</p>
              <p className="text-xs font-medium" style={{ color: '#c9a84c' }}>
{user.role === 'supervisor' && user.scholar_no && VOX_O6_TITLES[user.scholar_no] ? VOX_O6_TITLES[user.scholar_no] : (ROLES[user.role] || user.role)}
                {user.scholar_no && ` · ${user.scholar_no}`}
              </p>
            </div>

            {/* Sign out — icon-only on mobile, text on sm+ */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)', padding: '6px 10px', minHeight: '36px' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)' }}
              title="Sign out"
            >
              <span className="hidden sm:inline">Sign out</span>
              <span className="sm:hidden text-base">⎋</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
