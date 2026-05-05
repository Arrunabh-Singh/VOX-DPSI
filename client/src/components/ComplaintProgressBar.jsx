/**
 * ComplaintProgressBar — visual lifecycle tracker for students (#9)
 *
 * Shows a horizontal step-by-step indicator: Received → Acknowledged →
 * Being Handled → Escalated (conditional) → Resolved/Closed.
 *
 * The step shown as "active" is derived from the raw status value so no
 * extra data is needed from the server.
 */

const STEPS = [
  {
    key: 'received',
    label: 'Received',
    icon: '📬',
    statuses: ['raised'],
    desc: 'Your concern has been logged.',
  },
  {
    key: 'acknowledged',
    label: 'Acknowledged',
    icon: '✅',
    statuses: ['verified'],
    desc: 'A council member has met with you.',
  },
  {
    key: 'handling',
    label: 'Being Handled',
    icon: '🔄',
    statuses: ['in_progress', 'escalated_to_teacher', 'escalated_to_coordinator', 'escalated_to_principal', 'requires_ic'],
    desc: 'Someone is actively working on it.',
  },
  {
    key: 'resolved',
    label: 'Resolved',
    icon: '🌿',
    statuses: ['resolved', 'closed'],
    desc: 'Your concern has been addressed.',
  },
]

function getActiveIndex(status) {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (STEPS[i].statuses.includes(status)) return i
  }
  return 0 // default to first step
}

export default function ComplaintProgressBar({ status }) {
  const activeIdx = getActiveIndex(status)
  const isClosed  = status === 'closed'
  const isResolved = status === 'resolved' || isClosed

  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(45,92,38,0.1)' }}>
      <p className="text-xs font-bold uppercase tracking-wide mb-4" style={{ color: '#2d5c26' }}>
        Complaint Progress
      </p>

      {/* Step track */}
      <div className="relative flex items-start">
        {/* Connector line behind the circles */}
        <div
          className="absolute top-4 left-0 right-0 h-0.5"
          style={{ background: '#E5E7EB', zIndex: 0, left: '16px', right: '16px' }}
        />
        {/* Filled portion of the connector */}
        <div
          className="absolute top-4 h-0.5 transition-all duration-700"
          style={{
            background: isResolved ? '#16A34A' : '#2d5c26',
            zIndex: 1,
            left: '16px',
            width: `calc(${(activeIdx / (STEPS.length - 1)) * 100}% - 32px * ${activeIdx / (STEPS.length - 1)})`,
            // simplified: cover proportional distance between first and last node
            right: 'auto',
          }}
        />

        {STEPS.map((step, idx) => {
          const done    = idx < activeIdx
          const current = idx === activeIdx
          const future  = idx > activeIdx

          const circleColor = done || current
            ? (isResolved ? '#16A34A' : '#2d5c26')
            : '#E5E7EB'

          const textColor = future ? '#9CA3AF' : (isResolved ? '#16A34A' : '#2d5c26')

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative" style={{ zIndex: 2 }}>
              {/* Circle */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-500 border-2"
                style={{
                  background: done || current ? circleColor : '#fff',
                  borderColor: circleColor,
                  boxShadow: current ? `0 0 0 4px ${isResolved ? 'rgba(22,163,74,0.15)' : 'rgba(45,92,38,0.15)'}` : 'none',
                }}
              >
                {done ? (
                  <span className="text-white text-xs font-black">✓</span>
                ) : current ? (
                  <span style={{ filter: future ? 'grayscale(1)' : 'none' }}>{step.icon}</span>
                ) : (
                  <span style={{ opacity: 0.4, fontSize: '11px' }}>{idx + 1}</span>
                )}
              </div>

              {/* Label */}
              <p
                className="text-xs font-bold mt-1.5 text-center leading-tight"
                style={{ color: textColor, maxWidth: '64px' }}
              >
                {step.label}
              </p>

              {/* Active step description */}
              {current && (
                <p
                  className="text-xs text-center mt-1 leading-snug hidden sm:block"
                  style={{ color: '#6B7280', maxWidth: '72px' }}
                >
                  {step.desc}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Current status pill */}
      <div className="mt-4 text-center">
        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-bold"
          style={{
            background: isResolved ? 'rgba(22,163,74,0.1)' : 'rgba(45,92,38,0.08)',
            color: isResolved ? '#16A34A' : '#2d5c26',
          }}
        >
          {STEPS[activeIdx]?.desc}
        </span>
      </div>
    </div>
  )
}
