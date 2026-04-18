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
      className="bg-white rounded-xl border border-gray-200 hover:border-[#003366] hover:shadow-md transition-all cursor-pointer p-4"
      onClick={() => navigate(`/complaints/${complaint.id}`)}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="font-mono font-bold text-[#003366] text-sm">
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
        <p className="text-sm text-gray-700 font-medium mb-1">
          {studentName}
          {complaint.student?.scholar_no && (
            <span className="text-gray-400 font-normal"> · {complaint.student.scholar_no}</span>
          )}
        </p>
      )}

      <p className="text-sm text-gray-500 line-clamp-2 mb-3">
        {complaint.description}
      </p>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{formatIST(complaint.created_at)}</span>
        <span>{timeAgo(complaint.created_at)}</span>
      </div>
    </div>
  )
}
