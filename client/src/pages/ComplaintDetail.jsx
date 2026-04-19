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

const actionBtn = (style = 'primary') => ({
  primary:   { background: 'linear-gradient(135deg,#003366,#004080)', color: '#fff' },
  blue:      { background: '#2563EB', color: '#fff' },
  indigo:    { background: '#4F46E5', color: '#fff' },
  green:     { background: '#16A34A', color: '#fff' },
  orange:    { background: '#EA580C', color: '#fff' },
}[style])

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

  if (loading) return <div className="min-h-screen" style={{ background: '#F0F4F8' }}><Navbar /><LoadingSpinner message="Loading complaint..." /></div>
  if (!complaint) return <div className="min-h-screen" style={{ background: '#F0F4F8' }}><Navbar /><div className="text-center py-20 text-gray-500">Complaint not found.</div></div>

  const role = user?.role
  const isCouncil = role === 'council_member'
  const isTeacher = role === 'class_teacher'
  const isCoordinator = role === 'coordinator'
  const isPrincipal = role === 'principal'
  const isSupervisor = role === 'supervisor'
  const canResolve = ['council_member', 'class_teacher', 'coordinator', 'principal'].includes(role)
  const isCurrentHandler = complaint.current_handler_role === role
  const canEscalate = isCurrentHandler && !['resolved', 'closed'].includes(complaint.status)
  const canVerify = isCouncil && complaint.status === 'raised'
  const canMarkInProgress = (
    (isCouncil && complaint.status === 'verified') ||
    (isTeacher && complaint.status === 'escalated_to_teacher' && isCurrentHandler) ||
    (isCoordinator && complaint.status === 'escalated_to_coordinator' && isCurrentHandler)
  )
  const canAddNote = role !== 'student'
  const studentDisplay = complaint.student?.name === 'Anonymous Student'
    ? <span className="text-gray-400 italic">Anonymous Student</span>
    : complaint.student?.name

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <Navbar />
      {showEscalate && (
        <EscalateModal complaint={complaint} userRole={role} onClose={() => setShowEscalate(false)} onSuccess={refetch} />
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-2 rounded-xl transition-colors text-sm font-medium mb-5 flex items-center gap-1"
          style={{ color: '#003366' }}
          onMouseEnter={e => e.currentTarget.style.background = '#DCFCE7'}
          onMouseLeave={e => e.currentTarget.style.background = ''}
        >← Back</button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header card */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="font-mono font-black text-2xl" style={{ color: '#003366' }}>
                    {complaint.complaint_no_display}
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <DomainBadge domain={complaint.domain} size="lg" />
                    {complaint.is_anonymous_requested && role !== 'student' && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-semibold">🔒 Anon Requested</span>
                    )}
                  </div>
                </div>
                <StatusPill status={complaint.status} size="lg" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm pt-4" style={{ borderTop: '1px solid rgba(0,51,102,0.1)' }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Raised On</p>
                  <p className="font-medium text-gray-700 mt-0.5">{formatIST(complaint.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Last Updated</p>
                  <p className="font-medium text-gray-700 mt-0.5">{formatIST(complaint.updated_at)}</p>
                </div>
                {complaint.student && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Student</p>
                    <p className="font-medium text-gray-700 mt-0.5">{studentDisplay}</p>
                    {complaint.student?.scholar_no && (
                      <p className="text-xs text-gray-400">{complaint.student.scholar_no} · {complaint.student.section}</p>
                    )}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Current Handler</p>
                  <p className="font-medium text-gray-700 mt-0.5">{ROLES[complaint.current_handler_role] || complaint.current_handler_role}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold mb-3" style={{ color: '#003366' }}>Description</h3>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{complaint.description}</p>
              {complaint.attachment_url && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,51,102,0.1)' }}>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Attachment</p>
                  <a href={complaint.attachment_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: '#003366' }}>
                    📎 View Attachment
                  </a>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold mb-4" style={{ color: '#003366' }}>Activity Timeline</h3>
              <Timeline entries={timeline} />
              {canAddNote && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,51,102,0.1)' }}>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#336699' }}>Add a Note</label>
                  <div className="flex gap-2">
                    <input
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Add an update or note..."
                      className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none transition-all"
                      style={{ border: '1.5px solid #D1FAE5', background: 'rgba(255,255,255,0.7)' }}
                      onFocus={e => e.target.style.borderColor = '#003366'}
                      onBlur={e => e.target.style.borderColor = '#D1FAE5'}
                      onKeyDown={e => e.key === 'Enter' && addNote()}
                    />
                    <button
                      onClick={addNote}
                      disabled={actionLoading}
                      className="px-4 py-2 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#003366,#004080)' }}
                    >Add</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {(canVerify || canMarkInProgress || canResolve || canEscalate) && (
              <div className="glass rounded-2xl p-5">
                <h3 className="font-bold mb-4" style={{ color: '#003366' }}>Actions</h3>
                <div className="space-y-2">
                  {canVerify && (
                    <button onClick={() => doAction('verify', { note: 'Verified the complaint in person.' })} disabled={actionLoading}
                      className="w-full py-3 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
                      style={actionBtn('blue')}>✓ Mark as Verified</button>
                  )}
                  {canMarkInProgress && (
                    <button onClick={() => doAction('status', { status: 'in_progress' })} disabled={actionLoading}
                      className="w-full py-3 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
                      style={actionBtn('indigo')}>🔄 Mark as In Progress</button>
                  )}
                  {canResolve && !['resolved', 'closed'].includes(complaint.status) && (
                    <button onClick={() => { const note = window.prompt('Resolution note (optional):'); doAction('resolve', { note: note || 'Complaint resolved.' }) }}
                      disabled={actionLoading}
                      className="w-full py-3 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
                      style={actionBtn('green')}>✅ Mark as Resolved</button>
                  )}
                  {canEscalate && (
                    <button onClick={() => setShowEscalate(true)} disabled={actionLoading}
                      className="w-full py-3 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
                      style={actionBtn('orange')}>⬆️ Escalate</button>
                  )}
                </div>
              </div>
            )}

            {/* Info card */}
            <div className="glass-dark rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#A7C4B0' }}>Complaint No</p>
              <p className="font-mono font-black text-xl" style={{ color: '#F0B429' }}>{complaint.complaint_no_display}</p>
              <p className="text-xs font-semibold uppercase tracking-wide mt-3 mb-0.5" style={{ color: '#A7C4B0' }}>Status</p>
              <p className="font-semibold text-white">{complaint.status?.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
