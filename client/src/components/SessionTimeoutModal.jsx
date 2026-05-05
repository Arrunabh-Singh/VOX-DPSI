/**
 * SessionTimeoutModal — shown 60 s before auto-logout (#31)
 * Rendered at App root so it overlays every page.
 */
export default function SessionTimeoutModal({ secondsLeft, onExtend, onLogout }) {
  const pct = Math.round((secondsLeft / 60) * 100)

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"
        style={{ background: '#fff', border: '1px solid rgba(45,92,38,0.12)' }}
      >
        {/* Countdown ring */}
        <div className="relative w-20 h-20 mx-auto mb-5">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#E5E7EB" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={secondsLeft <= 15 ? '#DC2626' : '#2d5c26'}
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center font-black text-xl"
            style={{ color: secondsLeft <= 15 ? '#DC2626' : '#2d5c26' }}
          >
            {secondsLeft}
          </span>
        </div>

        <h2 className="text-lg font-black mb-1" style={{ color: '#1A1A1A' }}>
          Still there?
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          You'll be signed out in <strong>{secondsLeft} second{secondsLeft !== 1 ? 's' : ''}</strong> due
          to inactivity. Any unsaved work may be lost.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 transition-all"
            style={{ border: '1.5px solid #E5E7EB' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            Sign out now
          </button>
          <button
            onClick={onExtend}
            className="flex-1 py-2.5 rounded-xl text-sm font-black text-white transition-all"
            style={{ background: 'linear-gradient(135deg,#2d5c26,#1e3f18)' }}
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  )
}
