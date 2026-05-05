import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { useAuth } from '../context/AuthContext'
import { useComplaint } from '../hooks/useComplaints'
import Navbar from '../components/Navbar'
import StatusPill from '../components/StatusPill'
import DomainBadge from '../components/DomainBadge'
import ComplaintProgressBar from '../components/ComplaintProgressBar'
import FeedbackCard from '../components/FeedbackCard'
import Timeline from '../components/Timeline'
import EscalateModal from '../components/EscalateModal'
import AppealModal from '../components/AppealModal'
import MergeModal from '../components/MergeModal'
import ResolutionTemplatePicker from '../components/ResolutionTemplatePicker'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { useLanguage } from '../context/LanguageContext'
import InternalNotes from '../components/InternalNotes'
import Footer from '../components/Footer'
import { SkeletonList } from '../components/SkeletonCard'
import { formatIST } from '../utils/formatDate'
import { ROLES } from '../utils/constants'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { RequestConsensusButton } from '../components/ConsensusVotingPanel'

export default function ComplaintDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { complaint, timeline, loading, refetch } = useComplaint(id)
  const [showEscalate, setShowEscalate] = useState(false)
  const [showAppeal, setShowAppeal] = useState(false)
  const [showDeleteRequest, setShowDeleteRequest] = useState(false)
  const [showMerge, setShowMerge] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [noteText, setNoteText] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [deletionPending, setDeletionPending] = useState(false)
  const [showResolveInput, setShowResolveInput] = useState(false)
  const [resolveNote, setResolveNote] = useState('')
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawReason, setWithdrawReason] = useState('')
  const [showEnquiry, setShowEnquiry] = useState(false)
  const [enquiryFindings, setEnquiryFindings] = useState('')
  const [assignTarget, setAssignTarget] = useState('')
  const [staffList, setStaffList] = useState([])
  const [showReopenModal, setShowReopenModal] = useState(false)
  const { t } = useLanguage()
  const [reopenReason, setReopenReason] = useState('')
  const [reopenLoading, setReopenLoading] = useState(false)

  // #1 Collision Detection — show who else is viewing this complaint (handlers only)
  const [activeViewers, setActiveViewers] = useState([])
  useEffect(() => {
    if (!id || !user || user.role === 'student') return
    const fetchViewers = async () => {
      try {
        const { data } = await api.get(`/api/complaints/${id}/viewers`)
        setActiveViewers(data.viewers || [])
      } catch { /* silent */ }
    }
    fetchViewers()
    const interval = setInterval(fetchViewers, 30_000) // refresh every 30 s
    return () => clearInterval(interval)
  }, [id, user])

  // Generate and print a formal complaint report in a new window
  const printReport = () => {
    const domainLabel = {
      academics: 'Academics', infrastructure: 'Infrastructure', safety: 'Safety',
      personal: 'Personal', behaviour: 'Behaviour', other: 'Other',
    }[complaint.domain] || complaint.domain

    const isFinal    = ['resolved', 'closed'].includes(complaint.status)
    const statusLabel = (complaint.status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const handlerName = complaint.council_member?.name || '—'
    const studentName = complaint.is_anonymous_requested && !complaint.identity_revealed
      ? 'Anonymous (identity protected)'
      : (complaint.student?.name || '—')
    const scholarNo   = complaint.student?.scholar_no || '—'
    const section     = complaint.student?.section    || '—'
    const isPosh      = complaint.is_posh_flagged || complaint.is_pocso_flagged
    const generatedBy = user?.name || 'Staff'
    const genTime     = new Date().toLocaleString('en-IN', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })

    const timelineRows = (timeline || []).map(t => `
      <tr>
        <td style="padding:6px 10px;font-size:12px;color:#555;white-space:nowrap">${new Date(t.created_at).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</td>
        <td style="padding:6px 10px;font-size:12px;color:#1a1a1a">${t.action || ''}</td>
        <td style="padding:6px 10px;font-size:12px;color:#555">${(t.performer?.name || '') + (t.performer?.role ? ` (${t.performer.role.replace(/_/g,' ')})` : '')}</td>
        <td style="padding:6px 10px;font-size:12px;color:#555">${t.note || ''}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${isFinal ? 'Final' : 'Interim'} Complaint Report — ${complaint.complaint_no_display}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Georgia', serif; color: #1a1a1a; background: #fff; padding: 32px; max-width: 900px; margin: 0 auto; }
  .watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-35deg); font-size:72px; font-weight:bold; color:rgba(0,51,102,0.04); pointer-events:none; white-space:nowrap; z-index:0; }
  .header { display:flex; align-items:flex-start; gap:20px; border-bottom: 3px solid #003366; padding-bottom:16px; margin-bottom:24px; position:relative; }
  .logo-text h1 { font-size:24px; font-weight:bold; color:#003366; letter-spacing:0.5px; }
  .logo-text .sub { font-size:11px; color:#666; margin-top:2px; }
  .badge-row { display:flex; gap:8px; align-items:center; margin-top:8px; }
  .badge { font-size:10px; font-weight:bold; letter-spacing:1px; padding:3px 10px; border-radius:4px; display:inline-block; }
  .badge-official { background:#003366; color:#FFD700; }
  .badge-interim  { background:#D97706; color:#fff; }
  .badge-final    { background:#16A34A; color:#fff; }
  .badge-posh     { background:#DC2626; color:#fff; }
  .meta-right { margin-left:auto; text-align:right; }
  .meta-right p { font-size:11px; color:#888; margin-bottom:2px; }
  h2 { font-size:14px; font-weight:bold; color:#003366; border-bottom:1.5px solid #dde4f0; padding-bottom:5px; margin-bottom:14px; margin-top:28px; text-transform:uppercase; letter-spacing:0.5px; }
  .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:10px 28px; }
  .field label { font-size:9.5px; font-weight:bold; text-transform:uppercase; letter-spacing:0.7px; color:#888; display:block; margin-bottom:2px; }
  .field p { font-size:13px; color:#1a1a1a; }
  .desc-box { background:#f7f8fa; border:1px solid #d1d9e6; border-radius:6px; padding:14px 16px; font-size:13px; line-height:1.8; white-space:pre-wrap; color:#1a1a1a; }
  .warn-box { background:#FEF2F2; border:1px solid #FECACA; border-radius:6px; padding:10px 14px; font-size:12px; color:#991B1B; margin-bottom:16px; }
  table { width:100%; border-collapse:collapse; }
  thead th { background:#003366; color:#fff; padding:8px 10px; text-align:left; font-size:10.5px; letter-spacing:0.5px; }
  tbody tr:nth-child(even) { background:#f5f7fa; }
  tbody tr { border-bottom:1px solid #e8edf5; }
  .sig-grid { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:48px; }
  .sig-box { border-top:1.5px solid #333; padding-top:6px; }
  .sig-box .sig-name { font-size:12px; font-weight:bold; color:#1a1a1a; }
  .sig-box .sig-role { font-size:11px; color:#666; margin-top:1px; }
  .sig-box .sig-line { margin-top:32px; font-size:11px; color:#666; border-top: 1px solid #999; padding-top:4px; }
  .footer { margin-top:36px; padding-top:10px; border-top:2px solid #003366; font-size:9.5px; color:#888; display:flex; justify-content:space-between; }
  .no-break { page-break-inside:avoid; }
  .print-btn-area { text-align:center; margin-top:24px; }
  @media print {
    body { padding: 16px; }
    .print-btn-area { display:none; }
    .watermark { display:block; }
  }
</style>
</head>
<body>
  <div class="watermark">${isFinal ? 'FINAL RECORD' : 'INTERIM RECORD'}</div>

  <!-- Header -->
  <div class="header">
    <div class="logo-text">
      <h1>VOX DPSI</h1>
      <div class="sub">Student Grievance Management System · Delhi Public School Indore</div>
      <div class="badge-row">
        <span class="badge badge-official">OFFICIAL COMPLAINT RECORD</span>
        <span class="badge ${isFinal ? 'badge-final' : 'badge-interim'}">${isFinal ? '✓ FINAL REPORT' : '⏳ INTERIM REPORT'}</span>
        ${isPosh ? '<span class="badge badge-posh">⚠ SENSITIVE MATTER</span>' : ''}
      </div>
    </div>
    <div class="meta-right">
      <p><strong>Delhi Public School Indore</strong></p>
      <p>Khandwa Road, Indore — 452 001 (M.P.)</p>
      <p style="margin-top:6px">Report generated: ${genTime}</p>
      <p>Generated by: ${generatedBy}</p>
    </div>
  </div>

  ${isPosh ? '<div class="warn-box">⚠️ <strong>CONFIDENTIAL:</strong> This complaint has been flagged as a sensitive matter under POSH Act / POCSO Act. Handle with strictest confidentiality and share only with authorised personnel.</div>' : ''}

  <!-- Complaint Details -->
  <h2>Complaint Details</h2>
  <div class="grid-2">
    <div class="field"><label>Complaint Number</label><p style="font-family:monospace;font-weight:bold;font-size:16px;color:#003366">${complaint.complaint_no_display}</p></div>
    <div class="field"><label>Status</label><p><strong>${statusLabel}</strong></p></div>
    <div class="field"><label>Domain / Category</label><p>${domainLabel}</p></div>
    <div class="field"><label>Priority</label><p>${complaint.priority === 'urgent' ? '⚡ URGENT' : 'Normal'}</p></div>
    <div class="field"><label>Date Filed</label><p>${new Date(complaint.created_at).toLocaleString('en-IN',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p></div>
    <div class="field"><label>Last Updated</label><p>${new Date(complaint.updated_at).toLocaleString('en-IN',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p></div>
    <div class="field"><label>Current Handler</label><p>${(complaint.current_handler_role || '—').replace(/_/g,' ')}</p></div>
    <div class="field"><label>Assigned To</label><p>${handlerName}</p></div>
  </div>

  <!-- Student Information -->
  <h2>Student / Complainant Information</h2>
  <div class="grid-2">
    <div class="field"><label>Name</label><p>${studentName}</p></div>
    <div class="field"><label>Scholar No.</label><p>${scholarNo}</p></div>
    <div class="field"><label>Section / Class</label><p>${section}</p></div>
    <div class="field"><label>House</label><p>${complaint.student?.house || '—'}</p></div>
    <div class="field"><label>Anonymity Requested</label><p>${complaint.is_anonymous_requested ? 'Yes — Identity Protected' : 'No'}</p></div>
    <div class="field"><label>Identity Revealed to Handlers</label><p>${complaint.identity_revealed ? 'Yes (consent given)' : 'No'}</p></div>
  </div>

  <!-- Description -->
  <h2>Complaint Description</h2>
  <div class="desc-box">${complaint.description || '—'}</div>

  ${complaint.attachment_url ? `
  <h2>Attachment</h2>
  <p style="font-size:13px;color:#555">An attachment was submitted with this complaint. View the original record in the system for access: <em>${complaint.attachment_url.split('/').pop()}</em></p>
  ` : ''}

  ${complaint.enquiry_findings ? `
  <h2>Enquiry Findings</h2>
  <div class="desc-box" style="background:#fffbeb;border-color:#fde68a">${complaint.enquiry_findings}</div>
  ` : ''}

  ${complaint.resolution_note ? `
  <h2>Resolution Note</h2>
  <div class="desc-box" style="background:#f0fdf4;border-color:#bbf7d0">${complaint.resolution_note}</div>
  ` : ''}

  <!-- Activity Timeline -->
  <h2 style="margin-top:28px">Activity Timeline (${(timeline || []).length} events)</h2>
  <div class="no-break">
  <table>
    <thead><tr><th style="width:160px">Timestamp (IST)</th><th>Action</th><th style="width:140px">Performed By</th><th>Note</th></tr></thead>
    <tbody>${timelineRows || '<tr><td colspan="4" style="text-align:center;padding:12px;color:#999">No timeline entries recorded</td></tr>'}</tbody>
  </table>
  </div>

  <!-- Signature Block -->
  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-name">Assigned Council Member</div>
      <div class="sig-role">${handlerName}</div>
      <div class="sig-line">Signature &amp; Date: _______________________</div>
    </div>
    <div class="sig-box">
      <div class="sig-name">Verified By (Coordinator / Principal)</div>
      <div class="sig-role">&nbsp;</div>
      <div class="sig-line">Name, Signature &amp; Date: _________________</div>
    </div>
  </div>

  <div class="footer">
    <span>Vox DPSI — Student Grievance Management System · Delhi Public School Indore</span>
    <span>Complaint ${complaint.complaint_no_display} · Generated ${genTime}</span>
  </div>

  <div class="print-btn-area">
    <button onclick="window.print()" style="padding:10px 32px;background:#003366;color:#FFD700;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;font-family:Georgia,serif;margin-right:12px">🖨️ Print This Report</button>
    <button onclick="window.close()" style="padding:10px 20px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:8px;font-size:14px;cursor:pointer;font-family:Georgia,serif">✕ Close</button>
  </div>
</body>
</html>`

    const w = window.open('', '_blank', 'width=960,height=800')
    w.document.write(html)
    w.document.close()
    w.focus()
  }

  // Load staff list when principal opens enquiry modal
  const loadStaff = async () => {
    try {
      const res = await api.get('/api/users')
      const staff = (res.data || []).filter(u =>
        ['coordinator', 'class_teacher', 'vice_principal'].includes(u.role)
      )
      setStaffList(staff)
    } catch {}
  }

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
  const isDirector = role === 'director'
  const isBoardMember = role === 'board_member'
  const isSupervisor = role === 'supervisor'
  const isStudent = role === 'student'
  const isPrincipalLevel = isPrincipal || isDirector || isBoardMember || isCoordinator
  const canResolve = ['council_member', 'class_teacher', 'coordinator', 'principal'].includes(role)
  const isCurrentHandler = complaint.current_handler_role === role
  const canEscalate = isCurrentHandler && !['resolved', 'closed', 'raised'].includes(complaint.status) && !isPrincipal
  const canVerify = isCouncil && complaint.status === 'raised'
  const canMarkInProgress = (
    (isCouncil && complaint.status === 'verified') ||
    (isTeacher && complaint.status === 'escalated_to_teacher' && isCurrentHandler) ||
    (isCoordinator && complaint.status === 'escalated_to_coordinator' && isCurrentHandler)
  )
  // Delete only allowed before escalation — not during active enquiry by higher authorities
  const canRequestDeletion = isCouncil &&
    ['raised', 'verified', 'in_progress'].includes(complaint.status)
  // Student can withdraw if complaint is still at council level (not escalated yet)
  const canWithdraw = isStudent && ['raised', 'verified'].includes(complaint.status)
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
      {showMerge && (
        <MergeModal
          sourceComplaint={{ ...complaint, complaint_no: complaint.complaint_no_display || `VOX-${String(complaint.complaint_no).padStart(3, '0')}` }}
          onClose={() => setShowMerge(false)}
          onSuccess={(targetId) => { setShowMerge(false); navigate(`/complaints/${targetId}`) }}
        />
      )}
      {showTemplatePicker && (
        <ResolutionTemplatePicker
          domain={complaint?.domain}
          onSelect={(text) => { setResolveNote(text); setShowTemplatePicker(false) }}
          onClose={() => setShowTemplatePicker(false)}
        />
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

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          className="sm:items-center sm:p-4" onClick={e => e.target === e.currentTarget && setShowWithdraw(false)}>
          <div className="glass-modal p-6 w-full rounded-t-2xl sm:rounded-2xl" style={{ maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-black text-lg text-gray-800">Withdraw Complaint</h2>
                <p className="text-gray-500 text-sm mt-0.5">This will close your complaint permanently.</p>
              </div>
              <button onClick={() => setShowWithdraw(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6B7280' }}>×</button>
            </div>
            <div className="rounded-xl px-4 py-3 mb-4" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <p className="text-orange-700 text-sm">⚠️ Once withdrawn, this complaint will be closed and cannot be reopened. Only withdraw if your issue has been resolved informally.</p>
            </div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2 text-gray-500">Reason for withdrawing (optional)</label>
            <textarea
              value={withdrawReason}
              onChange={e => setWithdrawReason(e.target.value)}
              rows={3}
              placeholder="E.g. Issue resolved directly with the council member..."
              className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none mb-4"
              style={{ border: '1.5px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.9)' }}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowWithdraw(false)} className="flex-1 py-3 rounded-xl font-semibold text-sm text-gray-600 border border-gray-200">Cancel</button>
              <button
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true)
                  try {
                    await api.patch(`/api/complaints/${id}/withdraw`, { reason: withdrawReason })
                    toast.success('Complaint withdrawn successfully')
                    setShowWithdraw(false)
                    refetch()
                  } catch (err) {
                    toast.error(err.response?.data?.error || 'Failed to withdraw')
                  } finally {
                    setActionLoading(false)
                  }
                }}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
                style={{ background: '#EA580C', border: 'none' }}>
                {actionLoading ? 'Withdrawing...' : 'Withdraw Complaint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formal Enquiry + Assign Modal */}
      {showEnquiry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          className="sm:items-center sm:p-4" onClick={e => e.target === e.currentTarget && setShowEnquiry(false)}>
          <div className="glass-modal p-6 w-full rounded-t-2xl sm:rounded-2xl" style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-black text-lg" style={{ color: '#2d5c26' }}>📋 Formal Enquiry</h2>
                <p className="text-gray-500 text-sm mt-0.5">Assign complaint and document official findings.</p>
              </div>
              <button onClick={() => setShowEnquiry(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6B7280' }}>×</button>
            </div>

            {/* Assign to staff */}
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2 text-gray-500">Assign Investigation To <span className="text-gray-400 font-normal">(optional)</span></label>
            <select
              value={assignTarget}
              onChange={e => setAssignTarget(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none mb-4"
              style={{ border: '1.5px solid rgba(45,92,38,0.15)', background: '#fff', color: assignTarget ? '#1a1a1a' : '#9CA3AF' }}
            >
              <option value="">— No specific assignment —</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role.replace(/_/g, ' ')}{s.section ? ` · ${s.section}` : ''})
                </option>
              ))}
            </select>

            <label className="block text-xs font-semibold uppercase tracking-wide mb-2 text-gray-500">Findings / Directives <span className="text-red-400">*</span></label>
            <textarea
              value={enquiryFindings}
              onChange={e => setEnquiryFindings(e.target.value)}
              rows={4}
              placeholder="Document your findings, observations, or instructions for the assigned staff..."
              className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none mb-1"
              style={{ border: '1.5px solid rgba(45,92,38,0.2)', background: 'rgba(255,255,255,0.9)' }}
              onFocus={e => e.target.style.borderColor = '#2d5c26'}
              onBlur={e => e.target.style.borderColor = 'rgba(45,92,38,0.2)'}
            />
            <p className={`text-xs mb-4 ${enquiryFindings.length >= 10 ? 'text-green-600' : 'text-gray-400'}`}>{enquiryFindings.length} / 10 min</p>
            <div className="flex gap-3">
              <button onClick={() => setShowEnquiry(false)} className="flex-1 py-3 rounded-xl font-semibold text-sm text-gray-600 border border-gray-200">Cancel</button>
              <button
                disabled={enquiryFindings.length < 10 || actionLoading}
                onClick={async () => {
                  setActionLoading(true)
                  try {
                    await api.post(`/api/complaints/${id}/enquiry`, {
                      findings: enquiryFindings,
                      assigned_to: assignTarget || undefined,
                    })
                    toast.success('Enquiry note recorded in timeline')
                    setShowEnquiry(false)
                    setEnquiryFindings('')
                    setAssignTarget('')
                    refetch()
                  } catch (err) {
                    toast.error(err.response?.data?.error || 'Failed to save enquiry note')
                  } finally {
                    setActionLoading(false)
                  }
                }}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
                style={{ background: '#2d5c26', border: 'none' }}>
                {actionLoading ? 'Saving...' : 'Record & Assign'}
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
            {/* Resolved: student must Close or Appeal */}
            {isStudent && complaint.status === 'resolved' && (
              <div className="glass rounded-2xl p-6" style={{ border: '2px solid #BBF7D0' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">✅</span>
                  <h3 className="font-black text-lg" style={{ color: '#16A34A' }}>Complaint Resolved</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">Your complaint has been marked as resolved. Please confirm if you're satisfied, or file an appeal if you disagree.</p>
                {complaint.resolution_note && (
                  <div className="rounded-xl px-4 py-3 mb-4 text-sm" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Resolution Note</p>
                    <p className="text-gray-700">{complaint.resolution_note}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={actionLoading}
                    onClick={async () => {
                      setActionLoading(true)
                      try {
                        await api.patch(`/api/complaints/${id}/close`, { note: 'Student confirmed resolution and closed the complaint.' })
                        toast.success('Complaint closed. Thank you!')
                        refetch()
                      } catch (err) {
                        toast.error(err.response?.data?.error || 'Failed to close')
                      } finally { setActionLoading(false) }
                    }}
                    className="py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                    style={{ background: '#16A34A', color: '#fff', border: 'none' }}
                  >✓ Confirm &amp; Close</button>
                  <button
                    onClick={() => setShowAppeal(true)}
                    className="py-3 rounded-xl font-bold text-sm"
                    style={{ background: '#EDE9FE', color: '#7C3AED', border: '1.5px solid #C4B5FD' }}
                  >⚖️ File an Appeal</button>
                </div>
              </div>
            )}
            {/* Appealed banner */}
            {complaint.status === 'appealed' && (
              <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: '#EDE9FE', border: '1px solid #C4B5FD' }}>
                <span>📋</span>
                <p className="text-purple-800 text-sm font-medium">This complaint has been appealed. Review required by Supervisor/Principal.</p>
              </div>
            )}

            {/* Re-open: available to students within 7 days of resolution/close (#3) */}
            {isStudent && ['resolved', 'closed'].includes(complaint.status) && (() => {
              const daysSince = complaint.updated_at
                ? (Date.now() - new Date(complaint.updated_at).getTime()) / (1000 * 60 * 60 * 24)
                : 99
              if (daysSince > 7) return null
              const daysLeft = Math.ceil(7 - daysSince)
              return (
                <div className="rounded-2xl p-5" style={{ background: 'rgba(255,237,213,0.6)', border: '1.5px solid #FED7AA' }}>
                  {!showReopenModal ? (
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="font-bold text-sm" style={{ color: '#9A3412' }}>Not satisfied with the resolution?</p>
                        <p className="text-xs text-orange-700 mt-0.5">You can reopen this complaint. Window closes in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.</p>
                      </div>
                      <button
                        onClick={() => setShowReopenModal(true)}
                        className="px-4 py-2 rounded-xl text-sm font-bold"
                        style={{ background: '#EA580C', color: '#fff', border: 'none' }}
                      >🔄 Reopen</button>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-sm mb-2" style={{ color: '#9A3412' }}>Why are you reopening this complaint?</p>
                      <textarea
                        value={reopenReason}
                        onChange={e => setReopenReason(e.target.value)}
                        placeholder="Describe what was not resolved or what new information you have... (min 10 characters)"
                        rows={3}
                        maxLength={500}
                        className="w-full rounded-xl px-3 py-2 text-sm resize-none focus:outline-none mb-3"
                        style={{ border: '1.5px solid #FED7AA', background: 'rgba(255,255,255,0.7)' }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowReopenModal(false); setReopenReason('') }}
                          className="flex-1 py-2 rounded-xl text-sm font-semibold"
                          style={{ background: 'transparent', border: '1.5px solid #FED7AA', color: '#9A3412' }}
                        >Cancel</button>
                        <button
                          disabled={reopenLoading || reopenReason.trim().length < 10}
                          onClick={async () => {
                            setReopenLoading(true)
                            try {
                              await api.patch(`/api/complaints/${id}/reopen`, { reason: reopenReason.trim() })
                              toast.success('Complaint reopened. Your handler will follow up.')
                              setShowReopenModal(false)
                              setReopenReason('')
                              refetch()
                            } catch (err) {
                              toast.error(err.response?.data?.error || 'Failed to reopen')
                            } finally { setReopenLoading(false) }
                          }}
                          className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                          style={{ background: '#EA580C', color: '#fff', border: 'none' }}
                        >{reopenLoading ? 'Reopening…' : '🔄 Confirm Reopen'}</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

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
                    {complaint.respondent_type && complaint.respondent_type !== 'student' && (
                      <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '20px', border: '1px solid #BFDBFE' }}>
                        {{
                          teaching_staff: '👨‍🏫 Teaching Staff',
                          non_teaching_staff: '🧹 Non-Teaching Staff',
                          council_member: '📛 Council Member',
                          school_policy: '📜 School Policy',
                        }[complaint.respondent_type] || complaint.respondent_type}
                      </span>
                    )}
                    {complaint.is_posh_pocso && (
                      <span style={{ background: '#FEF2F2', color: '#DC2626', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', border: '1px solid #FECACA' }}>
                        🔴 POSH/POCSO
                      </span>
                    )}
                  </div>
                </div>
                <StatusPill status={complaint.status} />
              </div>

              {/* #1 Collision warning — shown when other handlers are actively viewing */}
              {activeViewers.length > 0 && !isStudent && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                  background: 'rgba(254,243,199,0.7)', border: '1px solid #FDE68A',
                  borderRadius: '10px', padding: '8px 12px', marginTop: '10px',
                }}>
                  <span style={{ fontSize: '14px' }}>👁️</span>
                  <span style={{ fontSize: '12px', color: '#92400E', fontWeight: '600' }}>
                    Also viewing:{' '}
                    {activeViewers.map((v, i) => (
                      <span key={v.id}>
                        {v.name}
                        <span style={{ fontWeight: '400', opacity: 0.7 }}>
                          {' '}({v.role.replace(/_/g, ' ')})
                        </span>
                        {i < activeViewers.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </span>
                </div>
              )}

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

            {/* Progress bar — shown to students and read-only roles */}
            {['student', 'supervisor', 'director', 'board_member'].includes(user?.role) && (
              <ComplaintProgressBar status={complaint.status} />
            )}

            {/* Description */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold mb-3" style={{ color: '#2d5c26' }}>Description</h3>
              {/* PII masking notice for council members who haven't verified in-person yet */}
              {isCouncil && complaint.description_masked && (
                <div className="rounded-xl px-4 py-3 mb-3 flex items-start gap-2" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                  <span className="mt-0.5">🔒</span>
                  <div>
                    <p className="text-orange-800 font-semibold text-xs">Full description locked until in-person verification</p>
                    <p className="text-orange-700 text-xs mt-0.5">Meet with the student in person and click "Mark as Verified" to unlock the full complaint details.</p>
                  </div>
                </div>
              )}
              {/* POSH/POCSO routing notice */}
              {complaint.is_posh_pocso && (
                <div className="rounded-xl px-4 py-3 mb-3 flex items-start gap-2" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <span className="mt-0.5">🔴</span>
                  <div>
                    <p className="text-red-800 font-bold text-xs">POSH/POCSO Protocol — Internal Committee Referral</p>
                    <p className="text-red-700 text-xs mt-0.5">This complaint has been routed directly to the Internal Committee per statutory requirements. Council member access is restricted.</p>
                  </div>
                </div>
              )}
              <MarkdownRenderer text={complaint.description || ''} className="text-gray-700" />
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold" style={{ color: '#2d5c26' }}>Activity Timeline</h3>
                {/* Print Report — visible to all staff at any stage */}
                {!isStudent && (
                  <button
                    onClick={printReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: '#003366', color: '#FFD700', border: 'none' }}
                  >🖨️ Print Report</button>
                )}
              </div>
              {/* CSAT feedback — shown to students when resolved/closed (#10) */}
              {user?.role === 'student' && ['resolved', 'closed'].includes(complaint.status) && (
                <div className="mb-4">
                  <FeedbackCard complaintId={complaint.id} />
                </div>
              )}
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
            {/* Student: Withdraw complaint */}
            {canWithdraw && (
              <div className="glass rounded-2xl p-5">
                <h3 className="font-bold mb-3" style={{ color: '#2d5c26' }}>Manage</h3>
                <button
                  onClick={() => setShowWithdraw(true)}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}
                >
                  ↩️ Withdraw Complaint
                </button>
                <p className="text-xs text-gray-400 mt-2 text-center">Only while still at council level</p>
              </div>
            )}

            {/* Principal/Director: Formal Enquiry */}
            {isPrincipalLevel && !['closed'].includes(complaint.status) && (
              <div className="glass rounded-2xl p-5">
                <h3 className="font-bold mb-3" style={{ color: '#2d5c26' }}>Formal Enquiry</h3>
                <button
                  onClick={() => { setShowEnquiry(true); loadStaff() }}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: '#F0FDF4', color: '#2d5c26', border: '1.5px solid rgba(45,92,38,0.25)' }}
                >
                  📋 Add Enquiry Note
                </button>
                <p className="text-xs text-gray-400 mt-2 text-center">Logged to timeline as official record</p>
              </div>
            )}

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
                      style={actionBtnStyle('blue')}>{t('detail.markVerified')}</button>
                  )}
                  {canMarkInProgress && (
                    <button onClick={() => doAction('status', { status: 'in_progress' })} disabled={actionLoading}
                      className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
                      style={actionBtnStyle('indigo')}>{t('detail.markInProgress')}</button>
                  )}
                  {canResolve && !['resolved', 'closed'].includes(complaint.status) && !showResolveInput && (() => {
                    // #21 — For council members on behaviour/personal complaints, require peer consensus
                    const needsConsensus =
                      role === 'council_member' &&
                      ['behaviour', 'personal'].includes(complaint.domain) &&
                      complaint.consensus_status !== 'approved'
                    if (needsConsensus) {
                      return (
                        <RequestConsensusButton
                          complaintId={complaint.id}
                          existingNote={resolveNote}
                          consensusStatus={complaint.consensus_status}
                          onRequested={() => refetch()}
                        />
                      )
                    }
                    return (
                      <button onClick={() => setShowResolveInput(true)} disabled={actionLoading}
                        className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
                        style={actionBtnStyle('green')}>{t('detail.markResolved')}</button>
                    )
                  })()}
                  {showResolveInput && (
                    <div className="rounded-xl p-3 space-y-2" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-green-700">{t('detail.resolveNote')} ({t('common.optional')})</p>
                        <button
                          onClick={() => setShowTemplatePicker(true)}
                          className="text-xs font-semibold px-2 py-1 rounded-lg transition-all"
                          style={{ background: 'rgba(45,92,38,0.08)', color: '#2d5c26', border: '1px solid rgba(45,92,38,0.2)' }}
                        >{t('detail.useTemplate')}</button>
                      </div>
                      <textarea
                        value={resolveNote}
                        onChange={e => setResolveNote(e.target.value)}
                        rows={2}
                        placeholder={t('detail.resolveNote.ph')}
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
                      style={actionBtnStyle('orange')}>{t('detail.escalate')}</button>
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

            {/* ── #7 Merge complaint — coordinator / principal / supervisor ── */}
            {['coordinator','principal','supervisor','vice_principal','director','board_member'].includes(role) &&
              !['merged','resolved','closed','archived'].includes(complaint.status) && (
              <div className="glass rounded-2xl p-5">
                <h3 className="font-bold mb-1 text-sm" style={{ color: '#2d5c26' }}>🔀 Merge Complaint</h3>
                <p className="text-xs text-gray-400 mb-3">Combine this duplicate with the primary complaint thread. This complaint will be closed and its history copied.</p>
                <button
                  onClick={() => setShowMerge(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'rgba(79,70,229,0.08)', color: '#4F46E5', border: '1.5px solid rgba(79,70,229,0.2)' }}
                >
                  🔀 Merge into another complaint
                </button>
              </div>
            )}

            {/* merged-into banner */}
            {complaint.status === 'merged' && complaint.merged_into_id && (
              <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(79,70,229,0.07)', border: '1.5px solid rgba(79,70,229,0.2)' }}>
                <p className="text-sm font-bold" style={{ color: '#4F46E5' }}>🔀 This complaint has been merged</p>
                <button
                  onClick={() => navigate(`/complaints/${complaint.merged_into_id}`)}
                  className="mt-2 text-xs font-semibold underline"
                  style={{ color: '#4F46E5', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  View primary complaint →
                </button>
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
