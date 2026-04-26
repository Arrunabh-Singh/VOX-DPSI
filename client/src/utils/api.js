import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vox_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 — auto logout
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('vox_token')
      localStorage.removeItem('vox_user')
      window.location.href = '/login'
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
