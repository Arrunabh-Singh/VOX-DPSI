import { useNavigate } from 'react-router-dom'
import StatusPill from './StatusPill'
import DomainBadge from './DomainBadge'
import { timeAgo, formatIST } from '../utils/formatDate'
import { useAuth } from '../context/AuthContext'

function SLABadge({ updatedAt, status }) {
  if (['resolved', 'closed'].includes(status)) return null
  const hours = (Date.now() - new Date(updatedAt).getTime()) / 3600000
  let label, bg, color
  if (hours < 24)      { label = 'On Track';  bg = '#DCFCE7'; color = '#16A34A' }
  else if (hours < 40) { label = 'Due Soon';  bg = '#FEF3C7'; color = '#D97706' }
  else if (hours < 48) { label = 'Act Now';   bg = '#FFEDD5'; color = '#EA580C' }
  else                 { label = 'OVERDUE 🔴'; bg = '#FEE2E2'; color = '#DC2626' }
  return (
    <span style={{ background: bg, color, fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
      {label}
    </span>
  )
}

export default function ComplaintCard({ complaint }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const showStudentName = ['council_member', 'supervisor', 'principal', 'coordinator', 'class_teacher'].includes(user?.role)
  const studentName = complaint.student?.name || 'Unknown'
  const isUrgent = complaint.priority === 'urgent'
  const isAnon = complaint.is_anonymous_requested

  return (
    <div
      className="glass rounded-2xl cursor-pointer p-4 transition-all duration-200"
      style={{
        border: isUrgent ? '1px solid rgba(234,88,12,0.3)' : '1px solid rgba(45,92,38,0.06)',
        borderLeft: isUrgent ? '3px solid #EA580C' : undefined,
      }}
      onClick={() => navigate(`/complaints/${complaint.id}`)}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(45,92,38,0.12)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-sm" style={{ color: '#2d5c26' }}>
            {complaint.complaint_no_display}
          </span>
          {isUrgent && (
            <span style={{ background: '#FEF3C7', color: '#D97706', fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              URGENT
            </span>
          )}
          {isAnon && showStudentName && (
            <span style={{ background: '#EDE9FE', color: '#7C3AED', fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '20px' }}>
              Anon Req
            </span>
          )}
        </div>
        <StatusPill status={complaint.status} />
      </div>

      {/* Domain */}
      <div className="mb-2">
        <DomainBadge domain={complaint.domain} />
      </div>

      {/* Student name (for staff roles) */}
      {showStudentName && (
        <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>
          {studentName}
          {complaint.student?.scholar_no && (
            <span className="text-gray-400 font-normal"> · {complaint.student.scholar_no}</span>
          )}
          {isAnon && <span className="text-purple-500 font-normal"> (Anon Requested)</span>}
        </p>
      )}

      {/* Description snippet */}
      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{complaint.description}</p>

      {/* Bottom row */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Raised {timeAgo(complaint.created_at)}</span>
        <SLABadge updatedAt={complaint.updated_at || complaint.created_at} status={complaint.status} />
      </div>
    </div>
  )
}
