import { DOMAINS } from '../utils/constants'

export default function DomainBadge({ domain, size = 'sm' }) {
  const d = DOMAINS[domain] || { label: domain, icon: '📋', color: '#6B7280', bg: '#F9FAFB' }
  const padding = size === 'lg' ? 'px-3 py-1 text-sm gap-1.5' : 'px-2 py-0.5 text-xs gap-1'
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${padding}`}
      style={{ color: d.color, backgroundColor: d.bg, border: `1px solid ${d.color}30` }}
    >
      <span>{d.icon}</span>
      <span>{d.label}</span>
    </span>
  )
}
