import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useComplaint } from '../hooks/useComplaints'
import Navbar from '../components/Navbar'
import StatusPill from '../components/StatusPill'
import DomainBadge from '../components/DomainBadge'
import Timeline from '../components/Timeline'
import EscalateModal from '../components/EscalateModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatIST } from '../utils/formatDate'
import { ROLES } from '../utils/constants'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function ComplaintDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { complaint, timeline, loading, refetch } = useComplaint(id)
  const [showEscalate, setShowEscalate] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const doAction = async (type, payload = {}) => {
    setActionLoading(true)
    try {
      await api.patch(`/api/complaints/${id}/${type}`, payload)
      toast.success('Action completed successfully')
      refetch()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const addNote = async () => {
    if (!noteText.trim()) return toast.error('Note cannot be empty')
    setActionLoading(true)
    try {
      await api.post(`/api/complaints/${id}/timeline`, { note: noteText.trim() })
      setNoteText('')
      toast.success('Note added')
      refetch()
    } catch (err) {
      toast.error('Failed to add note')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#F5F7FA]"><Navbar /><LoadingSpinner message="Loading complaint..." /></div>
  if (!complaint) return <div className="min-h-screen bg-[#F5F7FA]"><Navbar /><div className="text-center py-20 text-gray-500">Complaint not found.</div></div>

  const role = user?.role
  const isCouncil = role === 'council_member'
  const isTeacher = role === 'class_teacher'
  const isCoordinator = role === 'coordinator'
  const isPrincipal = role === 'principal'
  const isSupervisor = role === 'supervisor'
  const canResolve = ['council_member', 'class_teacher', 'coordinator', 'principal'].includes(role)
  const canEscalate = ['council_member', 'class_teacher', 'coordinator'].includes(role)
  const canVerify = isCouncil && complaint.status === 'raised'
  const canMarkInProgress = isCouncil && complaint.status === 'verified'
  const canAddNote = role !== 'student'

  const studentDisplay = complaint.student?.name === 'Anonymous Student'
    ? <span className="text-gray-400 italic">Anonymous Student</span>
    : complaint.student?.name

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Navbar />
      {showEscalate && (
        <EscalateModal
          complaint={complaint}
          userRole={role}
          onClose={() => setShowEscalate(false)}
          onSuccess={refetch}
        />
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="text-[#003366] hover:bg-blue-50 px-3 py-2 rounded-xl transition-colors text-sm font-medium mb-5 flex items-center gap-1"
        >
          ← Back
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="font-mono font-black text-[#003366] text-2xl">
                    {complaint.complaint_no_display}
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <DomainBadge domain={complaint.domain} size="lg" />
                    {complaint.is_anonymous_requested && isCouncil && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-semibold">
                        🔒 Anon Requested
                      </span>
                    )}
                  </div>
                </div>
                <StatusPill status={complaint.status} size="lg" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Raised On</p>
                  <p className="font-medium text-gray-700 mt-0.5">{formatIST(complaint.created_at)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Last Updated</p>
                  <p className="font-medium text-gray-700 mt-0.5">{formatIST(complaint.updated_at)}</p>
                </div>
                {(isCouncil || isSupervisor || isPrincipal || isCoordinator || role === 'student') && complaint.student && (
                  <div>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Student</p>
                    <p className="font-medium text-gray-700 mt-0.5">{studentDisplay}</p>
                    {complaint.student?.scholar_no && (
                      <p className="text-gray-400 text-xs">{complaint.student.scholar_no} · {complaint.student.section}</p>
                    )}
                  </div>
                )}
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Current Handler</p>
                  <p className="font-medium text-gray-700 mt-0.5">{ROLES[complaint.current_handler_role] || complaint.current_handler_role}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-800 mb-3">Description</h3>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{complaint.description}</p>

              {complaint.attachment_url && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Attachment</p>
                  <a
                    href={complaint.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#003366] font-medium hover:underline"
                  >
                    📎 View Attachment
                  </a>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-800 mb-4">Activity Timeline</h3>
              <Timeline entries={timeline} />

              {/* Add note */}
              {canAddNote && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add a Note</label>
                  <div className="flex gap-2">
                    <input
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Add an update or note..."
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
                      onKeyDown={e => e.key === 'Enter' && addNote()}
                    />
                    <button
                      onClick={addNote}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-[#003366] text-white rounded-xl text-sm font-semibold hover:bg-[#002952] disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar — Actions */}
          <div className="space-y-4">
            {/* Action panel */}
            {(canVerify || canMarkInProgress || canResolve || canEscalate) && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-800 mb-4">Actions</h3>
                <div className="space-y-2">
                  {canVerify && (
                    <button
                      onClick={() => doAction('verify', { note: 'Verified the complaint in person.' })}
                      disabled={actionLoading}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      ✓ Mark as Verified
                    </button>
                  )}
                  {canMarkInProgress && (
                    <button
                      onClick={() => doAction('status', { status: 'in_progress' })}
                      disabled={actionLoading}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      🔄 Mark as In Progress
                    </button>
                  )}
                  {canResolve && !['resolved', 'closed'].includes(complaint.status) && (
                    <button
                      onClick={() => {
                        const note = window.prompt('Resolution note (optional):')
                        doAction('resolve', { note: note || 'Complaint resolved.' })
                      }}
                      disabled={actionLoading}
                      className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      ✅ Mark as Resolved
                    </button>
                  )}
                  {canEscalate && !['resolved', 'closed', 'escalated_to_principal'].includes(complaint.status) && (
                    <button
                      onClick={() => setShowEscalate(true)}
                      disabled={actionLoading}
                      className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                      ⬆️ Escalate
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Info card */}
            <div className="bg-[#003366] rounded-2xl p-5 text-white">
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-1">Complaint No</p>
              <p className="font-mono font-black text-[#FFD700] text-xl">{complaint.complaint_no_display}</p>
              <p className="text-blue-200 text-xs mt-3 font-semibold uppercase tracking-wide">Status</p>
              <p className="font-semibold text-white mt-0.5">{complaint.status?.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
