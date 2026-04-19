import { STATUSES } from '../utils/constants'

export default function StatusPill({ status, size = 'sm' }) {
  const s = STATUSES[status] || { label: status, color: '#6B7280', bg: '#F3F4F6' }
  const padding = size === 'lg' ? 'px-4 py-1.5 text-sm' : 'px-2.5 py-0.5 text-xs'
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${padding}`}
      style={{ color: s.color, backgroundColor: s.bg, border: `1px solid ${s.color}22` }}
    >
      {s.label}
    </span>
  )
}
