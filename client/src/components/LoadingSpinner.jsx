import { useState, useEffect } from 'react'

export default function LoadingSpinner({ message = 'Loading...' }) {
  const [slowMsg, setSlowMsg] = useState(null)

  useEffect(() => {
    // After 3s, hint that we're waking the server
    const t1 = setTimeout(() => setSlowMsg('Waking up the server — one moment…'), 3000)
    // After 8s, reassure
    const t2 = setTimeout(() => setSlowMsg('Almost there — Railway server is starting up…'), 8000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      {/* Spinner */}
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: '#2d5c26', borderTopColor: 'transparent' }} />
        <div className="absolute inset-2 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#c9a84c', borderTopColor: 'transparent', animationDirection: 'reverse', animationDuration: '0.7s' }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: '#2d5c26' }}>{message}</p>
      {slowMsg && (
        <p className="text-xs text-gray-400 max-w-xs text-center animate-pulse">{slowMsg}</p>
      )}
    </div>
  )
}
