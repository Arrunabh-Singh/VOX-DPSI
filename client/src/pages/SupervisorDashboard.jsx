import { useState, useEffect } from 'react'
import { useComplaints } from '../hooks/useComplaints'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import { SkeletonList } from '../components/SkeletonCard'
import Footer from '../components/Footer'
import { DOMAINS, STATUSES } from '../utils/constants'
import api from '../utils/api'
import toast from 'react-hot-toast'
import AnalyticsDashboard from '../components/AnalyticsDashboard'

function SupervisorAppealsView({ appeals, loading }) {
  if (loading) return <div className="glass rounded-2xl p-8 text-center text-gray-400">Loading appeals...</div>
  if (appeals.length === 0) return (
    <div className="glass rounded-2xl p-12 text-center">
      <p className="text-5xl mb-3">📋</p>
      <h3 className="font-bold text-gray-700 text-lg">No Appeals Yet</h3>
      <p className="text-gray-500 text-sm mt-1">Student appeals will appear here for monitoring.</p>
    </div>
  )
  return (
    <div className="space-y-4">
      <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <span>👁️</span>
        <p className="text-blue-700 text-sm font-medium">Supervisor view: Appeals are reviewed by the Principal. You can monitor them here.</p>
      </div>
      {appeals.map(appeal => (
        <div key={appeal.id} className="glass rounded-2xl p-5" style={{ border: appeal.status === 'pending' ? '2px solid #7C3AED' : '1px solid rgba(0,0,0,0.06)' }}>
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm" style={{ color: '#2d5c26' }}>{appeal.complaint?.complaint_no_display || 'VOX-???'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={appeal.status === 'pending' ? { background: '#EDE9FE', color: '#7C3AED' } : appeal.status === 'upheld' ? { background: '#DCFCE7', color: '#16A34A' } : { background: '#FEE2E2', color: '#DC2626' }}>
                  {appeal.status === 'pending' ? '⏳ Pending' : appeal.status === 'upheld' ? '✅ Upheld' : '❌ Rejected'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Filed by <strong>{appeal.student?.name || 'Student'}</strong> · {new Date(appeal.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="rounded-xl px-4 py-3 text-sm text-gray-700" style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.1)' }}>
            <p className="font-semibold text-xs text-purple-600 mb-1 uppercase tracking-wide">Appeal Reason</p>
            <p className="leading-relaxed">{appeal.reason}</p>
          </div>
          {appeal.status !== 'pending' && appeal.review_note && (
            <div className="rounded-xl px-4 py-3 mt-3 text-sm text-gray-700" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="font-semibold text-xs text-gray-500 mb-1 uppercase tracking-wide">Review Note</p>
              <p>{appeal.review_note}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function DeletionRequestsView({ deletions, loading, onReviewed }) {
  const [reviewing, setReviewing] = useState(null)
  const [decision, setDecision] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submitReview = async (reqId) => {
    if (!decision) return toast.error('Select Approve or Reject')
    setSubmitting(true)
    try {
      await api.patch(`/api/complaints/deletion-requests/${reqId}/review`, { decision, note })
      toast.success(decision === 'approved' ? '🗑️ Complaint deleted successfully' : '✅ Deletion request rejected')
      setReviewing(null); setDecision(''); setNote('')
      if (onReviewed) onReviewed()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Review failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="glass rounded-2xl p-8 text-center text-gray-400">Loading deletion requests...</div>
  if (deletions.length === 0) return (
    <div className="glass rounded-2xl p-12 text-center">
      <p className="text-5xl mb-3">🗑️</p>
      <h3 className="font-bold text-gray-700 text-lg">No Deletion Requests</h3>
      <p className="text-gray-500 text-sm mt-1">When council members flag complaints as invalid, requests appear here for your review.</p>
    </div>
  )

  const pending = deletions.filter(d => d.status === 'pending')

  return (
    <div className="space-y-4">
      <div className="rounded-xl px-4 py-3 flex items-start gap-2" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
        <span className="mt-0.5">⚠️</span>
        <p className="text-red-700 text-sm"><strong>Dual Approval System:</strong> Council members have already approved. Your approval is the final step. Approved complaints are permanently deleted.</p>
      </div>
      {pending.length > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
          <span>⏳</span>
          <p className="text-amber-800 text-sm font-semibold">{pending.length} deletion request{pending.length > 1 ? 's' : ''} awaiting your review</p>
        </div>
      )}
      {deletions.map(del => (
        <div key={del.id} className="glass rounded-2xl p-5" style={{ border: del.status === 'pending' ? '2px solid #DC2626' : '1px solid rgba(0,0,0,0.06)' }}>
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm" style={{ color: '#2d5c26' }}>{del.complaint?.complaint_no_display || 'VOX-???'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                  style={del.status === 'pending' ? { background: '#FEE2E2', color: '#DC2626' } : del.status === 'approved' ? { background: '#DCFCE7', color: '#16A34A' } : { background: '#E5E7EB', color: '#374151' }}>
                  {del.status === 'pending' ? '⏳ Awaiting Review' : del.status === 'approved' ? '🗑️ Deleted' : '✅ Kept'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                  {del.complaint?.domain}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Requested by <strong>{del.requested_by_user?.name || 'Council Member'}</strong> · {new Date(del.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="rounded-xl px-4 py-3 mb-3" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Original Description</p>
            <p className="text-sm text-gray-700 line-clamp-3">{del.complaint?.description}</p>
          </div>
          <div className="rounded-xl px-4 py-3 mb-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <p className="text-xs font-semibold text-red-500 mb-1 uppercase tracking-wide">Deletion Reason (Council)</p>
            <p className="text-sm text-gray-700">{del.reason}</p>
          </div>
          {del.status === 'pending' && (
            reviewing === del.id ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {[['approved','🗑️ Approve Deletion','#DC2626','#FEE2E2'],['rejected','✅ Reject — Keep Complaint','#16A34A','#DCFCE7']].map(([val, lbl, color, bg]) => (
                    <button key={val} onClick={() => setDecision(val)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                      style={decision === val ? { background: bg, borderColor: color, color } : { borderColor: '#E5E7EB', color: '#6B7280', background: '#fff' }}>
                      {lbl}
                    </button>
                  ))}
                </div>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                  placeholder="Optional: add a note for your decision..."
                  className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none"
                  style={{ border: '1.5px solid rgba(45,92,38,0.12)', background: 'rgba(255,255,255,0.9)' }} />
                <div className="flex gap-2">
                  <button onClick={() => { setReviewing(null); setDecision(''); setNote('') }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200">Cancel</button>
                  <button onClick={() => submitReview(del.id)} disabled={submitting || !decision}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: decision === 'approved' ? '#DC2626' : '#2d5c26', border: 'none' }}>
                    {submitting ? 'Processing...' : 'Confirm Decision'}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setReviewing(del.id)}
                className="mt-2 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: '#2d5c26', color: '#c9a84c', border: 'none' }}>
                Review Request
              </button>
            )
          )}
          {del.status !== 'pending' && del.superior_note && (
            <div className="rounded-xl px-3 py-2.5 mt-2 text-sm text-gray-600" style={{ background: 'rgba(0,0,0,0.03)' }}>
              <span className="text-xs font-semibold text-gray-400 uppercase">Your note: </span>{del.superior_note}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function SupervisorDashboard() {
  const { user } = useAuth()
  const { complaints, loading } = useComplaints()
  const [statusFilter, setStatusFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [activeTab, setActiveTab] = useState('complaints')
  const [appeals, setAppeals] = useState([])
  const [appealsLoading, setAppealsLoading] = useState(false)
  const [deletions, setDeletions] = useState([])
  const [deletionsLoading, setDeletionsLoading] = useState(false)
  useEffect(() => { document.title = 'Supervisor — Vox DPSI' }, [])

  useEffect(() => {
    if (activeTab === 'appeals') {
      setAppealsLoading(true)
      api.get('/api/complaints/appeals/all')
        .then(r => setAppeals(r.data))
        .catch(() => toast.error('Failed to load appeals'))
        .finally(() => setAppealsLoading(false))
    }
    if (activeTab === 'deletions') {
      setDeletionsLoading(true)
      api.get('/api/complaints/deletion-requests/all')
        .then(r => setDeletions(r.data))
        .catch(() => toast.error('Failed to load deletion requests'))
        .finally(() => setDeletionsLoading(false))
    }
  }, [activeTab])

  const filtered = complaints
    .filter(c => !statusFilter || c.status === statusFilter)
    .filter(c => !domainFilter || c.domain === domainFilter)

  const houseStats = complaints.reduce((acc, c) => {
    const house = c.student?.house || 'Unknown'
    if (!acc[house]) acc[house] = { total: 0, resolved: 0 }
    acc[house].total++
    if (['resolved', 'closed'].includes(c.status)) acc[house].resolved++
    return acc
  }, {})

  const sectionStats = complaints.reduce((acc, c) => {
    const sec = c.student?.section || 'Unknown'
    acc[sec] = (acc[sec] || 0) + 1
    return acc
  }, {})

  const domainBreakdown = complaints.reduce((acc, c) => {
    acc[c.domain] = (acc[c.domain] || 0) + 1
    return acc
  }, {})

  const overallStats = [
    { label: 'Total',       value: complaints.length,                                                            color: '#2d5c26' },
    { label: 'Resolved',    value: complaints.filter(c => ['resolved','closed'].includes(c.status)).length,      color: '#16A34A' },
    { label: 'In Progress', value: complaints.filter(c => c.status === 'in_progress').length,                    color: '#4F46E5' },
    { label: 'Escalated',   value: complaints.filter(c => c.status.includes('escalated')).length,                color: '#DC2626' },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#eae1c4' }}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header card */}
        <div className="glass-dark rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.6)' }}>Supervisor View</p>
              <h1 className="text-2xl font-black text-white mt-1">{user?.name}</h1>
              <p className="text-sm font-semibold mt-0.5" style={{ color: '#c9a84c' }}>
                {user?.house} House · {user?.section}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>System Total</p>
              <p className="text-5xl font-black" style={{ color: '#c9a84c' }}>{complaints.length}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>complaints</p>
            </div>
          </div>
        </div>

        {/* Overall stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {overallStats.map(s => (
            <div key={s.label} className="glass rounded-2xl p-4 text-center">
              <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Breakdowns */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="glass rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-3 uppercase tracking-wide" style={{ color: '#2d5c26' }}>By House</h3>
            <div className="space-y-2">
              {Object.entries(houseStats).length === 0
                ? <p className="text-gray-400 text-sm">No data</p>
                : Object.entries(houseStats).map(([house, data]) => (
                  <div key={house} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 font-medium">{house}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: '#2d5c26' }}>{data.total}</span>
                      <span className="text-xs text-gray-400"> / {data.resolved} resolved</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-3 uppercase tracking-wide" style={{ color: '#2d5c26' }}>By Domain</h3>
            <div className="space-y-2">
              {Object.entries(domainBreakdown).length === 0
                ? <p className="text-gray-400 text-sm">No data</p>
                : Object.entries(domainBreakdown).map(([dom, count]) => {
                  const d = DOMAINS[dom] || { icon: '📋', label: dom, color: '#6B7280' }
                  return (
                    <div key={dom} className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: d.color }}>{d.icon} {d.label}</span>
                      <span className="text-sm font-bold" style={{ color: d.color }}>{count}</span>
                    </div>
                  )
                })}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-3 uppercase tracking-wide" style={{ color: '#2d5c26' }}>By Section</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
              {Object.entries(sectionStats).length === 0
                ? <p className="text-gray-400 text-sm">No data</p>
                : Object.entries(sectionStats).sort((a, b) => b[1] - a[1]).map(([sec, count]) => (
                  <div key={sec} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 font-medium">{sec}</span>
                    <span className="text-sm font-bold" style={{ color: '#2d5c26' }}>{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Tab nav — scrolls horizontally on mobile */}
        <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {[
            ['complaints', '📋 Complaints'],
            ['appeals', `📩 Appeals${appeals.length > 0 ? ` (${appeals.filter(a=>a.status==='pending').length})` : ''}`],
            ['deletions', `🗑️ Deletions${deletions.filter(d=>d.status==='pending').length > 0 ? ` (${deletions.filter(d=>d.status==='pending').length})` : ''}`],
            ['analytics', '📊 Analytics'],
          ].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-shrink-0"
              style={activeTab === tab
                ? { background: '#2d5c26', color: '#c9a84c' }
                : { background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(45,92,38,0.12)', color: '#2d5c26' }}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'complaints' && (
          <>
            {/* Filters */}
            <div className="flex gap-3 mb-5 flex-wrap items-center">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="rounded-xl px-3 py-2 text-sm font-medium focus:outline-none"
                style={{ border: '1px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.8)', color: '#374151' }}>
                <option value="">All Statuses</option>
                {Object.entries(STATUSES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
              <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)}
                className="rounded-xl px-3 py-2 text-sm font-medium focus:outline-none"
                style={{ border: '1px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.8)', color: '#374151' }}>
                <option value="">All Domains</option>
                {Object.entries(DOMAINS).map(([k, d]) => <option key={k} value={k}>{d.icon} {d.label}</option>)}
              </select>
              <span className="text-sm text-gray-400 font-medium ml-auto">{filtered.length} of {complaints.length}</span>
            </div>

            {/* Read-only notice */}
            <div className="rounded-xl px-4 py-3 mb-5 flex items-start gap-2" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <span className="text-blue-500 mt-0.5">👁️</span>
              <p className="text-blue-700 text-sm">
                <strong>Supervisor view:</strong> You can see all complaints and student names. You can add notes but cannot change complaint statuses.
              </p>
            </div>

            {loading ? (
              <SkeletonList count={3} />
            ) : filtered.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-5xl mb-3">📭</p>
                <h3 className="font-bold text-gray-700 text-lg">No complaints found</h3>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(c => <ComplaintCard key={c.id} complaint={c} />)}
              </div>
            )}
          </>
        )}

        {activeTab === 'appeals' && (
          <SupervisorAppealsView appeals={appeals} loading={appealsLoading} />
        )}

        {activeTab === 'deletions' && (
          <DeletionRequestsView deletions={deletions} loading={deletionsLoading} onReviewed={() => {
            setDeletionsLoading(true)
            api.get('/api/complaints/deletion-requests/all')
              .then(r => setDeletions(r.data))
              .catch(() => toast.error('Failed to reload'))
              .finally(() => setDeletionsLoading(false))
          }} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard complaints={complaints} />
        )}
      </main>
      <Footer />
    </div>
  )
}
