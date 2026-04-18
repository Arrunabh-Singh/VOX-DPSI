import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ROLES } from '../utils/constants'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-[#003366] text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-full bg-[#FFD700] flex items-center justify-center">
            <span className="text-[#003366] font-black text-sm">V</span>
          </div>
          <div>
            <span className="font-black text-xl tracking-tight">Vox</span>
            <span className="text-[#FFD700] font-black text-xl"> DPSI</span>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-sm leading-tight">{user.name}</p>
              <p className="text-[#FFD700] text-xs font-medium">
                {ROLES[user.role] || user.role}
                {user.scholar_no && ` · ${user.scholar_no}`}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
