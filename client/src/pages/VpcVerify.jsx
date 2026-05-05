/**
 * VpcVerify — thin redirect page
 *
 * Parent receives email link: https://vox-dpsi.vercel.app/vpc/verify?token=…&action=grant|decline
 * This page reads those params and immediately forwards to the API server,
 * which renders a full server-side HTML confirmation page.
 */

import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function VpcVerify() {
  const [params] = useSearchParams()
  const token  = params.get('token')
  const action = params.get('action')

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    const dest = `${apiBase}/api/auth/vpc-verify?token=${encodeURIComponent(token || '')}&action=${encodeURIComponent(action || '')}`
    window.location.replace(dest)
  }, [token, action])

  return (
    <div
      style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#F5F7FA',
        fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px', height: '48px',
          border: '4px solid #BFDBFE',
          borderTopColor: '#003366',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ color: '#6B7280', fontSize: '15px', margin: 0 }}>
          Processing your response…
        </p>
        <p style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '8px' }}>
          You will be redirected automatically.
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
