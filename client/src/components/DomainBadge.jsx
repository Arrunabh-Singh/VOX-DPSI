import { DOMAINS } from '../utils/constants'
import { useLanguage } from '../context/LanguageContext'

export default function DomainBadge({ domain, size = 'sm' }) {
  const { t } = useLanguage()
  const d = DOMAINS[domain] || { label: domain, icon: '📋', color: '#6B7280', bg: '#F9FAFB' }
  const padding = size === 'lg' ? 'px-3 py-1 text-sm gap-1.5' : 'px-2 py-0.5 text-xs gap-1'
  const label = t(`domain.${domain}`) || d.label
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${padding}`}
      style={{ color: d.color, backgroundColor: d.bg, border: `1px solid ${d.color}30` }}
    >
      <span>{d.icon}</span>
      <span>{label}</span>
    </span>
  )
}
