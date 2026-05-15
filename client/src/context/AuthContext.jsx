// #51 — Token is now stored in an HttpOnly cookie set by the server.
// This file no longer reads/writes vox_token from localStorage.
// vox_user (non-sensitive profile data) and vox_auth_time (freshness cache) are
// still kept in localStorage for fast initial render — they contain no secret.
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
  // Only show loading spinner if we have a cached session to validate
  const [loading, setLoading] = useState(() => {
    try {
      return !!localStorage.getItem('vox_user')
    } catch { return false }
  })

  useEffect(() => {
    // Skip auth check on public pages to avoid 401 console errors
    const publicPaths = ['/login', '/register', '/vpc-verify', '/']
    if (publicPaths.includes(window.location.pathname)) {
      setLoading(false)
      return
    }

    // Short-circuit: if we verified auth recently (< 5 min), trust localStorage cache
    const lastVerified = parseInt(localStorage.getItem('vox_auth_time') || '0', 10)
    const isFresh = Date.now() - lastVerified < 5 * 60 * 1000
    const cachedUser = user // already loaded from localStorage initialiser above

    if (isFresh && cachedUser) {
      setLoading(false)
      // Background revalidate silently (cookie is sent automatically)
      api.get('/api/auth/me').then(res => {
        setUser(res.data)
        localStorage.setItem('vox_user', JSON.stringify(res.data))
        localStorage.setItem('vox_auth_time', String(Date.now()))
      }).catch(() => {})
      return
    }

    // No cached session or stale — validate with server (cookie sent automatically)
    api.get('/api/auth/me')
      .then(res => {
        setUser(res.data)
        localStorage.setItem('vox_user', JSON.stringify(res.data))
        localStorage.setItem('vox_auth_time', String(Date.now()))
      })
      .catch(() => {
        localStorage.removeItem('vox_user')
        localStorage.removeItem('vox_auth_time')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password })
    const { user } = res.data
    // Token is now set as HttpOnly cookie by the server — not stored here
    localStorage.setItem('vox_user', JSON.stringify(user))
    localStorage.setItem('vox_auth_time', String(Date.now()))
    setUser(user)
    return user
  }

  // Called after verify-login-otp sets the HttpOnly cookie — fetches /me and
  // updates React state so RequireAuth doesn't redirect back to /login.
  const loginWithCookie = async () => {
    const res = await api.get('/api/auth/me')
    const userData = res.data
    localStorage.setItem('vox_user', JSON.stringify(userData))
    localStorage.setItem('vox_auth_time', String(Date.now()))
    setUser(userData)
    return userData
  }

  const logout = async () => {
    // Tell server to clear the HttpOnly cookie
    try { await api.post('/api/auth/logout') } catch {}
    localStorage.removeItem('vox_user')
    localStorage.removeItem('vox_auth_time')
    // Clean up any legacy token key that may still exist in old sessions
    localStorage.removeItem('vox_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithCookie, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
