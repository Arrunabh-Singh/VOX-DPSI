/**
 * Format a date string/object to IST: "18 Apr 2026, 10:30 AM"
 */
export function formatIST(dateInput) {
  if (!dateInput) return '—'
  const d = new Date(dateInput)
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Time elapsed from date to now, e.g. "2 days ago"
 */
export function timeAgo(dateInput) {
  if (!dateInput) return ''
  const now = new Date()
  const then = new Date(dateInput)
  const diff = Math.floor((now - then) / 1000)

  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return `${Math.floor(diff / 604800)}w ago`
}
