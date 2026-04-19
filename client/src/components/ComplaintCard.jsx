import { useNavigate } from 'react-router-dom'
import StatusPill from './StatusPill'
import DomainBadge from './DomainBadge'
import { timeAgo, formatIST } from '../utils/formatDate'
import { useAuth } from '../context/AuthContext'

export default function ComplaintCard({ complaint }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const showStudentName = ['council_member', 'supervisor', 'principal'].includes(user?.role)
  const studentName = complaint.student?.name || 'Unknown'

  return (
    <div
      className="glass rounded-2xl cursor-pointer p-4 transition-all duration-200"
      style={{ border: '1px solid rgba(255,255,255,0.85)' }}
      onClick={() => navigate(`/complaints/${complaint.id}`)}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(27,77,43,0.14)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="font-mono font-bold text-sm" style={{ color: '#1B4D2B' }}>
            {complaint.complaint_no_display}
          </span>
          {complaint.is_anonymous_requested && showStudentName && (
            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              Anon Requested
            </span>
          )}
        </div>
        <StatusPill status={complaint.status} />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <DomainBadge domain={complaint.domain} />
      </div>

      {showStudentName && (
        <p className="text-sm font-medium mb-1" style={{ color: '#374151' }}>
          {studentName}
          {complaint.student?.scholar_no && (
            <span className="text-gray-400 font-normal"> · {complaint.student.scholar_no}</span>
          )}
        </p>
      )}

      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{complaint.description}</p>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{formatIST(complaint.created_at)}</span>
        <span>{timeAgo(complaint.created_at)}</span>
      </div>
    </div>
  )
}
