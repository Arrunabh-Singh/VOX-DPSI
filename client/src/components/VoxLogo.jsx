// VOX-DPSI Service Logo — shield + microphone mark

export function VoxMark({ size = 40 }) {
  const h = Math.round(size * 44 / 40)
  return (
    <svg width={size} height={h} viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield outer */}
      <path d="M20 2L37 8.5V23C37 34 29 41.5 20 43.5C11 41.5 3 34 3 23V8.5L20 2Z" fill="#1B4D2B"/>
      {/* Shield inner */}
      <path d="M20 5.5L34 11V23C34 32.5 27.5 39.5 20 41C12.5 39.5 6 32.5 6 23V11L20 5.5Z" fill="#163D22"/>
      {/* Microphone capsule */}
      <rect x="16.5" y="12" width="7" height="10" rx="3.5" fill="#C9920A"/>
      {/* Microphone highlight */}
      <rect x="18" y="13.5" width="2.5" height="3" rx="1.25" fill="rgba(255,255,255,0.25)"/>
      {/* Microphone arc */}
      <path d="M13.5 22.5C13.5 27 26.5 27 26.5 22.5" stroke="#F0B429" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      {/* Stand vertical */}
      <line x1="20" y1="27" x2="20" y2="30.5" stroke="#F0B429" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Stand base */}
      <line x1="16.5" y1="30.5" x2="23.5" y2="30.5" stroke="#F0B429" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

export function VoxWordmark({ light = false, size = 'md' }) {
  const color = light ? '#FFFFFF' : '#1B4D2B'
  const s = { sm: [28, 18], md: [36, 22], lg: [48, 30] }[size] || [36, 22]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <VoxMark size={s[0]} />
      <div style={{ lineHeight: 1 }}>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: s[1], color, letterSpacing: '-0.02em' }}>
          VOX <span style={{ color: '#C9920A' }}>DPSI</span>
        </span>
      </div>
    </div>
  )
}
