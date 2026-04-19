import { formatIST } from '../utils/formatDate'
import { ROLES } from '../utils/constants'

const actionColors = {
  'Complaint raised':   { bg: '#DCFCE7', border: '#16A34A', dot: '#16A34A' },
  'Verified in person': { bg: '#D1FAE5', border: '#059669', dot: '#059669' },
  'Complaint resolved': { bg: '#DCFCE7', border: '#16A34A', dot: '#16A34A' },
  'Note added':         { bg: '#F5F3FF', border: '#8B5CF6', dot: '#8B5CF6' },
  default:              { bg: '#F3F4F6', border: '#9CA3AF', dot: '#9CA3AF' },
}

function getColors(action) {
  for (const key of Object.keys(actionColors)) {
    if (key !== 'default' && action?.toLowerCase().includes(key.toLowerCase())) return actionColors[key]
  }
  if (action?.toLowerCase().includes('escalat')) return { bg: '#FFEDD5', border: '#EA580C', dot: '#EA580C' }
  return actionColors.default
}

export default function Timeline({ entries = [] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-4xl mb-2">📋</p>
        <p className="text-sm">No timeline entries yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, i) => {
        const colors = getColors(entry.action)
        const isLast = i === entries.length - 1
        return (
          <div key={entry.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full border-2 mt-1 flex-shrink-0" style={{ borderColor: colors.dot, backgroundColor: colors.dot }} />
              {!isLast && <div className="w-0.5 flex-1 my-1" style={{ background: 'rgba(0,51,102,0.12)' }} />}
            </div>
            <div className="pb-4 flex-1">
              <div className="rounded-xl p-3 border" style={{ backgroundColor: colors.bg, borderColor: colors.border + '55' }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm text-gray-800">{entry.action}</p>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{formatIST(entry.created_at)}</span>
                </div>
                {entry.performer && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    by <span className="font-medium">{entry.performer.name}</span>
                    {' '}({ROLES[entry.performed_by_role] || entry.performed_by_role})
                  </p>
                )}
                {entry.note && <p className="text-sm text-gray-700 mt-1.5 italic">"{entry.note}"</p>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
