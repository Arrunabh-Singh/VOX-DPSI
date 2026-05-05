import axios from 'axios'

// #51 — withCredentials sends the HttpOnly cookie on every request.
// The server reads the cookie in verifyToken(); Bearer header is no longer used.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,  // include HttpOnly cookie on cross-origin requests
})

// Handle 401 — server says token is missing or expired
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Clear any leftover localStorage user cache
      localStorage.removeItem('vox_user')
      localStorage.removeItem('vox_auth_time')
      // The HttpOnly cookie was already rejected by the server; redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// Keep-alive ping to Railway every 4 minutes to prevent cold starts
if (typeof window !== 'undefined') {
  setInterval(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/health`, { method: 'GET', mode: 'no-cors' }).catch(() => {})
  }, 4 * 60 * 1000)
}

export default api
