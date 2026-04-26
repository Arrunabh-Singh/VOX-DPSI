import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useComplaint } from '../hooks/useComplaints'
import Navbar from '../components/Navbar'
import StatusPill from '../components/StatusPill'
import DomainBadge from '../components/DomainBadge'
import Timeline from '../components/Timeline'
import EscalateModal from '../components/EscalateModal'
import FeedbackCard from '../components/FeedbackCard'
import AppealModal from '../components/AppealModal'
import InternalNotes from '../components/InternalNotes'
import Footer from '../components/Footer'
import { SkeletonList } from '../components/SkeletonCard'
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
  const [showAppeal, setShowAppeal] = useState(false)
  const [showDeleteRequest, setShowDeleteRequest] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [noteText, setNoteText] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [deletionPending, setDeletionPending] = useState(false)
  const [showResolveInput, setShowResolveInput] = useState(false)
  const [resolveNote, setResolveNote] = useState('')

  useEffect(() => {
    if (complaint?.complaint_no) {
      document.title = `VOX-${String(complaint.complaint_no).padStart(3,'0')} — Vox DPSI`
    } else {
      document.title = 'Complaint — Vox DPSI'
    }
  }, [complaint])

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

  if (loading) return (
    <div className="min-h-screen" style={{ background: '#eae1c4' }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8"><SkeletonList count={3} /></main>
    </div>
  )
  if (!complaint) return (
    <div className="min-h-screen" style={{ background: '#eae1c4' }}>
      <Navbar />
      <div className="text-center py-20 text-gray-500">Complaint not found.</div>
    </div>
  )

  const role = user?.role
  const isCouncil = role === 'council_member'
  const isTeacher = role === 'class_teacher'
  const isCoordinator = role === 'coordinator'
  const isPrincipal = role === 'principal'
  const isSupervisor = role === 'supervisor'
  const isStudent = role === 'student'
  const canResolve = ['council_member', 'class_teacher', 'coordinator', 'principal'].includes(role)
  const isCurrentHandler = complaint.current_handler_role === role
  const canEscalate = isCurrentHandler && !['resolved', 'closed', 'raised'].includes(complaint.status) && !isPrincipal
  const canVerify = isCouncil && complaint.status === 'raised'
  const canMarkInProgress = (
    (isCouncil && complaint.status === 'verified') ||
    (isTeacher && complaint.status === 'escalated_to_teacher' && isCurrentHandler) ||
    (isCoordinator && complaint.status === 'escalated_to_coordinator' && isCurrentHandler)
  )
  const canRequestDeletion = isCouncil && !['resolved', 'closed'].includes(complaint.status)
  const canAddNote = role !== 'student'
  const showStudentInfo = !isStudent
  const isAutoFlagged = complaint.priority === 'urgent' && timeline?.some(t => t.action?.includes('Auto-flagged'))
  const isAutoEscalated = complaint.is_auto_escalated

  // Student name display
  const studentDisplay = complaint.student?.name === 'Anonymous Student'
    ? <span className="text-gray-400 italic">Anonymous Student</span>
    : complaint.student?.name

  const actionBtnStyle = (variant) => ({
    navy:   { background: '#2d5c26', color: '#c9a84c', border: 'none' },
    blue:   { background: '#2563EB', color: '#fff', border: 'none' },
    indigo: { background: '#4F46E5', color: '#fff', border: 'none' },
    green:  { background: '#16A34A', color: '#fff', border: 'none' },
    orange: { background: '#EA580C', color: '#fff', border: 'none' },
  }[variant] || { background: '#2d5c26', color: '#c9a84c', border: 'none' })

  const isOverdue = !['resolved', 'closed'].includes(complaint.status) &&
    (Date.now() - new Date(complaint.updated_at || complaint.created_at).getTime()) > 48 * 3600000

  return (
    <div className="min-h-screen" style={{ background: '#eae1c4' }}>
      <Navbar />
      {showEscalate && (
        <EscalateModal complaint={complaint} userRole={role} onClose={() => setShowEscalate(false)} onSuccess={refetch} />
      )}
      {showAppeal && (
        <AppealModal complaintId={id} onClose={() => setShowAppeal(false)} onSuccess={refetch} />
      )}
      {showDeleteRequest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}
          className="sm:items-center sm:p-4" onClick={e => e.target === e.currentTarget && setShowDeleteRequest(false)}>
          <div className="glass-modal p-6 w-full rounded-t-2xl sm:rounded-2xl" style={{ maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-black text-lg" style={{ color: '#DC2626' }}>🗑️ Flag as Gibberish</h2>
                <p className="text-gray-500 text-sm mt-0.5">This will request deletion. A supervisor must also approve.</p>
              </div>
              <button onClick={() => setShowDeleteRequest(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6B7280' }}>×</button>
            </div>
            <div className="rounded-xl px-4 py-3 mb-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <p className="text-red-700 text-sm">⚠️ This is a serious action. The complaint will only be deleted after a supervisor reviews and approves your request. Both approvals are logged.</p>
            </div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2 text-gray-500">Reason for deletion request</label>
            <textarea
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              rows={4}
              placeholder="Explain why this complaint is invalid, spam, or gibberish (min 20 characters)..."
              className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none mb-1"
              style={{ border: '1.5px solid rgba(220,38,38,0.3)', background: 'rgba(255,255,255,0.9)' }}
            />
            <p className={`text-xs mb-4 ${deleteReason.length >= 20 ? 'text-green-600' : 'text-gray-400'}`}>{deleteReason.length} / 20 min</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteRequest(false)} className="flex-1 py-3 rounded-xl font-semibold text-sm text-gray-600 border border-gray-200">Cancel</button>
              <button
                disabled={deleteReason.length < 20 || actionLoading}
                onClick={async () => {
                  setActionLoading(true)
                  try {
                    await api.post(`/api/complaints/${id}/deletion-request`, { reason: deleteReason })
                    toast.success('Deletion request submitted — awaiting supervisor approval')
                    setDeletionPending(true)
                    setShowDeleteRequest(false)
                    setDeleteReason('')
                    refetch()
                  } catch (err) {
                    toast.error(err.response?.data?.error || 'Failed to submit request')
                  } finally {
                    setActionLoading(false)
                  }
                }}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
                style={{ background: '#DC2626', border: 'none' }}>
                {actionLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-medium mb-5 flex items-center gap-1 px-3 py-2 rounded-xl transition-colors"
          style={{ color: '#2d5c26' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(45,92,38,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}
        >← Back</button>

        {/* Banners */}
        {isOverdue && !isStudent && (
          <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
            <span>⚠️</span>
            <p className="text-amber-800 text-sm font-medium">This complaint has exceeded the 48-hour SLA. Please take immediate action.</p>
          </div>
        )}
        {isAutoFlagged && (
          <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <span>⚡</span>
            <p className="text-amber-700 text-sm">This complaint was automatically flagged as Urgent based on its content.</p>
          </div>
        )}
        {isAutoEscalated && (
          <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
            <span>⚠️</span>
            <p className="text-amber-800 text-sm">This complaint was auto-escalated due to no action within 72 hours.</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-5">
            {/* Feedback card for resolved complaints (student only) */}
            {isStudent && complaint.status === 'resolved' && !complaint.feedback_rating && (
              <FeedbackCard complaintId={id} onDone={refetch} />
            )}
            {isStudent && complaint.status === 'resolved' && complaint.feedback_rating && (
              <div className="glass rounded-2xl p-4 mb-0 text-center" style={{ border: '1px solid #DCFCE7' }}>
                <p className="text-sm font-medium text-gray-600">
                  Your rating: {'★'.repeat(complaint.feedback_rating)}{'☆'.repeat(5 - complaint.feedback_rating)} ({complaint.feedback_rating}/5)
                </p>
                {complaint.feedback_note && <p className="text-xs text-gray-400 mt-1">"{complaint.feedback_note}"</p>}
              </div>
            )}
            {/* Appeal option */}
            {isStudent && complaint.status === 'resolved' && (
              <div className="text-center py-2">
                <p className="text-xs text-gray-400">Not satisfied with the resolution?{' '}
                  <button onClick={() => setShowAppeal(true)} className="text-purple-600 underline font-medium" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    File an Appeal →
                  </button>
                </p>
              </div>
            )}
            {/* Appealed banner */}
            {complaint.status === 'appealed' && (
              <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: '#EDE9FE', border: '1px solid #C4B5FD' }}>
                <span>📋</span>
                <p className="text-purple-800 text-sm font-medium">This complaint has been appealed. Review required by Supervisor/Principal.</p>
              </div>
            )}
            {/* Header card */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-2xl" style={{ color: '#2d5c26' }}>
                      {complaint.complaint_no_display}
                    </span>
                    {complaint.priority === 'urgent' && (
                      <span style={{ background: '#FEF3C7', color: '#D97706', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px' }}>URGENT</span>
                    )}
                    {complaint.is_anonymous_requested && !isStudent && (
                      <span style={{ background: '#EDE9FE', color: '#7C3AED', fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '20px' }}>🔒 Anon Requested</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <DomainBadge domain={complaint.domain} />
                  </div>
                </div>
                <StatusPill status={complaint.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm pt-4" style={{ borderTop: '1px solid rgba(45,92,38,0.08)' }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Raised On</p>
                  <p className="font-medium text-gray-700 mt-0.5">{formatIST(complaint.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Last Updated</p>
                  <p className="font-medium text-gray-700 mt-0.5">{formatIST(complaint.updated_at)}</p>
                </div>
                {showStudentInfo && complaint.student && (
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
                  {complaint.current_handler ? (
                    <div className="mt-0.5">
                      <p className="font-semibold text-gray-800 text-sm">{complaint.current_handler.name}</p>
                      <p className="text-xs text-gray-500">{ROLES[complaint.current_handler_role] || complaint.current_handler_role}</p>
                    </div>
                  ) : (
                    <p className="font-medium text-gray-700 mt-0.5">{ROLES[complaint.current_handler_role] || complaint.current_handler_role}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold mb-3" style={{ color: '#2d5c26' }}>Description</h3>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{complaint.description}</p>
              {complaint.attachment_url && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(45,92,38,0.08)' }}>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Attachment</p>
                  <a href={complaint.attachment_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: '#2d5c26' }}>
                    📎 View Attachment
                  </a>
                </div>
              )}
            </div>

            {/* Internal Notes — staff only */}
            {!isStudent && <InternalNotes complaintId={id} />}

            {/* Timeline */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold mb-4" style={{ color: '#2d5c26' }}>Activity Timeline</h3>
              <Timeline entries={timeline} />
              {canAddNote && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(45,92,38,0.08)' }}>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2 text-gray-400">Add a Note</label>
                  <div className="flex gap-2">
                    <input
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Add an update or note..."
                      className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none transition-all"
                      style={{ border: '1.5px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.8)' }}
                      onFocus={e => e.target.style.borderColor = '#2d5c26'}
                      onBlur={e => e.target.style.borderColor = 'rgba(45,92,38,0.15)'}
                      onKeyDown={e => e.key === 'Enter' && addNote()}
                    />
                    <button
                      onClick={addNote}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                      style={{ background: '#2d5c26', color: '#c9a84c', border: 'none' }}
                    >Add</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Actions */}
            {(canVerify || canMarkInProgress || canResolve || canEscalate) && (
              <div className="glass rounded-2xl p-5">
                <h3 className="font-bold mb-4" style={{ color: '#2d5c26' }}>Actions</h3>
                <div className="space-y-2">
                  {isCouncil && complaint.status === 'raised' && !canVerify && (
                    <div className="rounded-xl px-3 py-2.5 text-center text-xs font-medium" style={{ background: '#FEF3C7', color: '#92400E' }}>
                      ⚠️ Verify the complaint first before escalating or resolving
                    </div>
                  )}
                  {canVerify && (
                    <button onClick={() => doAction('verify', { note: 'Verified the complaint in person.' })} disabled={actionLoading}
                      className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
                      style={actionBtnStyle('blue')}>✓ Mark as Verified</button>
                  )}
                  {canMarkInProgress && (
                    <button onClick={() => doAction('status', { status: 'in_progress' })} disabled={actionLoading}
                      className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
                      style={actionBtnStyle('indigo')}>🔄 Mark as In Progress</button>
                  )}
                  {canResolve && !['resolved', 'closed'].includes(complaint.status) && !showResolveInput && (
                    <button onClick={() => setShowResolveInput(true)} disabled={actionLoading}
                      className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
                      style={actionBtnStyle('green')}>✅ Mark as Resolved</button>
                  )}
                  {showResolveInput && (
                    <div className="rounded-xl p-3 space-y-2" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                      <p className="text-xs font-semibold text-green-700">Resolution note (optional)</p>
                      <textarea
                        value={resolveNote}
                        onChange={e => setResolveNote(e.target.value)}
                        rows={2}
                        placeholder="Brief note on how it was resolved..."
                        className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
                        style={{ border: '1px solid #BBF7D0', background: '#fff' }}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setShowResolveInput(false)}
                          className="flex-1 py-2 rounded-lg text-sm font-semibold text-gray-500 border border-gray-200 bg-white">Cancel</button>
                        <button onClick={() => { doAction('resolve', { note: resolveNote || 'Complaint resolved.' }); setShowResolveInput(false) }}
                          disabled={actionLoading}
                          className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                          style={{ background: '#16A34A' }}>Confirm</button>
                      </div>
                    </div>
                  )}
                  {canEscalate && (
                    <button onClick={() => setShowEscalate(true)} disabled={actionLoading}
                      className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
                      style={actionBtnStyle('orange')}>⬆️ Escalate</button>
                  )}
                  {canRequestDeletion && !deletionPending && (
                    <button onClick={() => setShowDeleteRequest(true)} disabled={actionLoading}
                      className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
                      style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                      🗑️ Flag as Gibberish
                    </button>
                  )}
                  {deletionPending && (
                    <div className="rounded-xl px-3 py-2.5 text-center text-sm font-medium" style={{ background: '#FEF3C7', color: '#92400E' }}>
                      ⏳ Deletion pending supervisor approval
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Info card */}
            <div className="glass-dark rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Complaint No</p>
              <p className="font-mono font-black text-xl" style={{ color: '#c9a84c' }}>{complaint.complaint_no_display}</p>
              <p className="text-xs font-semibold uppercase tracking-wide mt-3 mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Status</p>
              <p className="font-semibold text-white text-sm capitalize">{complaint.status?.replace(/_/g, ' ')}</p>
              {complaint.priority === 'urgent' && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide mt-3 mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Priority</p>
                  <p className="font-bold text-amber-400 text-sm">URGENT</p>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
