import { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('vox_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('vox_token')
    if (!token) { setLoading(false); return }

    // Short-circuit: if we verified auth recently (< 5 min), trust localStorage
    const lastVerified = parseInt(localStorage.getItem('vox_auth_time') || '0', 10)
    const isFresh = Date.now() - lastVerified < 5 * 60 * 1000
    const cachedUser = user // already loaded from localStorage initialiser above

    if (isFresh && cachedUser) {
      setLoading(false)
      // Background revalidate silently
      api.get('/api/auth/me').then(res => {
        setUser(res.data)
        localStorage.setItem('vox_user', JSON.stringify(res.data))
        localStorage.setItem('vox_auth_time', String(Date.now()))
      }).catch(() => {})
      return
    }

    api.get('/api/auth/me')
      .then(res => {
        setUser(res.data)
        localStorage.setItem('vox_user', JSON.stringify(res.data))
        localStorage.setItem('vox_auth_time', String(Date.now()))
      })
      .catch(() => {
        localStorage.removeItem('vox_token')
        localStorage.removeItem('vox_user')
        localStorage.removeItem('vox_auth_time')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password })
    const { token, user } = res.data
    localStorage.setItem('vox_token', token)
    localStorage.setItem('vox_user', JSON.stringify(user))
    localStorage.setItem('vox_auth_time', String(Date.now()))
    setUser(user)
    return user
  }

  const logout = () => {
    localStorage.removeItem('vox_token')
    localStorage.removeItem('vox_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
