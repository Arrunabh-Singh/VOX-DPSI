import { useState, useEffect } from 'react'
import { useComplaints } from '../hooks/useComplaints'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import Footer from '../components/Footer'
import { SkeletonList } from '../components/SkeletonCard'
import { DOMAINS, STATUSES } from '../utils/constants'
import api from '../utils/api'
import toast from 'react-hot-toast'
import AnalyticsDashboard from '../components/AnalyticsDashboard'

function AppealsPanel({ appeals, loading, onReviewed }) {
  const [reviewing, setReviewing] = useState(null) // appealId being reviewed
  const [decision, setDecision] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submitReview = async (appealId) => {
    if (!decision) return toast.error('Select Uphold or Reject')
    if (note.length < 10) return toast.error('Please add a note (min 10 characters)')
    setSubmitting(true)
    try {
      await api.patch(`/api/complaints/appeals/${appealId}/review`, { decision, note })
      toast.success(`Appeal ${decision === 'upheld' ? 'upheld ✅' : 'rejected ❌'}`)
      setReviewing(null); setDecision(''); setNote('')
      if (onReviewed) onReviewed()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Review failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="glass rounded-2xl p-8 text-center text-gray-400">Loading appeals...</div>

  const pending = appeals.filter(a => a.status === 'pending')
  const reviewed = appeals.filter(a => a.status !== 'pending')

  if (appeals.length === 0) return (
    <div className="glass rounded-2xl p-12 text-center">
      <p className="text-5xl mb-3">📋</p>
      <h3 className="font-bold text-gray-700 text-lg">No Appeals Yet</h3>
      <p className="text-gray-500 text-sm mt-1">When students appeal a resolution, they'll appear here for review.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
          <span>⏳</span>
          <p className="text-amber-800 text-sm font-semibold">{pending.length} appeal{pending.length > 1 ? 's' : ''} awaiting review</p>
        </div>
      )}
      {appeals.map(appeal => (
        <div key={appeal.id} className="glass rounded-2xl p-5" style={{ border: appeal.status === 'pending' ? '2px solid #7C3AED' : '1px solid rgba(0,0,0,0.06)' }}>
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm" style={{ color: '#2d5c26' }}>{appeal.complaint?.complaint_no_display || 'VOX-???'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={appeal.status === 'pending' ? { background: '#EDE9FE', color: '#7C3AED' } : appeal.status === 'upheld' ? { background: '#DCFCE7', color: '#16A34A' } : { background: '#FEE2E2', color: '#DC2626' }}>
                  {appeal.status === 'pending' ? '⏳ Pending Review' : appeal.status === 'upheld' ? '✅ Upheld' : '❌ Rejected'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Filed by <strong>{appeal.student?.name || 'Student'}</strong> · {new Date(appeal.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="rounded-xl px-4 py-3 mb-3 text-sm text-gray-700" style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.1)' }}>
            <p className="font-semibold text-xs text-purple-600 mb-1 uppercase tracking-wide">Appeal Reason</p>
            <p className="leading-relaxed">{appeal.reason}</p>
          </div>
          {appeal.status !== 'pending' && appeal.review_note && (
            <div className="rounded-xl px-4 py-3 text-sm text-gray-700" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="font-semibold text-xs text-gray-500 mb-1 uppercase tracking-wide">Review Note</p>
              <p>{appeal.review_note}</p>
              <p className="text-xs text-gray-400 mt-1">Reviewed by {appeal.reviewed_by?.name || 'Principal'} · {appeal.reviewed_at ? new Date(appeal.reviewed_at).toLocaleDateString('en-IN') : ''}</p>
            </div>
          )}
          {appeal.status === 'pending' && (
            reviewing === appeal.id ? (
              <div className="mt-3 space-y-3">
                <div className="flex gap-2">
                  {[['upheld','✅ Uphold Appeal','#16A34A','#DCFCE7'],['rejected','❌ Reject Appeal','#DC2626','#FEE2E2']].map(([val, lbl, color, bg]) => (
                    <button key={val} onClick={() => setDecision(val)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                      style={decision === val ? { background: bg, borderColor: color, color } : { borderColor: '#E5E7EB', color: '#6B7280', background: '#fff' }}>
                      {lbl}
                    </button>
                  ))}
                </div>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                  placeholder="Add your review note (min 10 characters)..."
                  className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none"
                  style={{ border: '1.5px solid rgba(45,92,38,0.12)', background: 'rgba(255,255,255,0.9)' }} />
                <div className="flex gap-2">
                  <button onClick={() => { setReviewing(null); setDecision(''); setNote('') }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200">Cancel</button>
                  <button onClick={() => submitReview(appeal.id)} disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: '#2d5c26', border: 'none' }}>
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setReviewing(appeal.id)}
                className="mt-3 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: '#2d5c26', color: '#c9a84c', border: 'none' }}>
                Review Appeal
              </button>
            )
          )}
        </div>
      ))}
    </div>
  )
}

export default function PrincipalDashboard() {
  const { user } = useAuth()
  const { complaints, loading } = useComplaints()
  const [statusFilter, setStatusFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [activeTab, setActiveTab] = useState('complaints')
  const [appeals, setAppeals] = useState([])
  const [appealsLoading, setAppealsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  useEffect(() => { document.title = 'Principal Overview — Vox DPSI' }, [])

  useEffect(() => {
    if (activeTab === 'appeals') {
      setAppealsLoading(true)
      api.get('/api/complaints/appeals/all')
        .then(r => setAppeals(r.data))
        .catch(() => toast.error('Failed to load appeals'))
        .finally(() => setAppealsLoading(false))
    }
  }, [activeTab])

  const filtered = complaints
    .filter(c => !statusFilter || c.status === statusFilter)
    .filter(c => !domainFilter || c.domain === domainFilter)
    .filter(c => {
      if (!searchQuery || searchQuery.trim().length < 2) return true
      const q = searchQuery.toLowerCase().trim()
      // Fuzzy: check if each word in query appears somewhere in the target
      const fuzzyMatch = (target, query) => {
        if (!target) return false
        const t = target.toLowerCase()
        // Exact substring match
        if (t.includes(query)) return true
        // Word-level match (allows partial word errors)
        return query.split('').every((ch, i) => {
          const pos = t.indexOf(ch)
          return pos !== -1
        }) && (
          // Tolerate 1 typo: at least 80% of query chars found in sequence
          (() => {
            let tIdx = 0, matches = 0
            for (const ch of query) {
              const pos = t.indexOf(ch, tIdx)
              if (pos !== -1) { matches++; tIdx = pos + 1 }
            }
            return matches / query.length >= 0.8
          })()
        )
      }
      return (
        fuzzyMatch(c.complaint_no_display, q) ||
        fuzzyMatch(c.description, q) ||
        fuzzyMatch(c.student?.name, q) ||
        fuzzyMatch(c.student?.scholar_no, q) ||
        fuzzyMatch(c.student?.section, q) ||
        fuzzyMatch(c.domain, q) ||
        fuzzyMatch(c.status?.replace(/_/g, ' '), q)
      )
    })

  const stats = {
    total:       complaints.length,
    resolved:    complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length,
    pending:     complaints.filter(c => !['resolved', 'closed'].includes(c.status)).length,
    toPrincipal: complaints.filter(c => c.status === 'escalated_to_principal').length,
  }

  const exportCSV = () => {
    const headers = ['Complaint No', 'Domain', 'Priority', 'Status', 'Student', 'Scholar No', 'Section', 'Date', 'Description']
    const rows = complaints.map(c => [
      c.complaint_no_display, c.domain, c.priority || 'normal', c.status,
      c.student?.name || '', c.student?.scholar_no || '', c.student?.section || '',
      new Date(c.created_at).toLocaleDateString('en-IN'),
      `"${(c.description || '').replace(/"/g, '""')}"`,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `vox-dpsi-complaints-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const statCards = [
    { label: 'Total Raised', value: stats.total,       color: '#2d5c26' },
    { label: 'Resolved',     value: stats.resolved,    color: '#16A34A' },
    { label: 'Pending',      value: stats.pending,     color: '#D97706' },
    { label: 'To Principal', value: stats.toPrincipal, color: '#DC2626' },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#eae1c4' }}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#2d5c26' }}>Principal's Dashboard</h1>
            <p className="text-gray-500 text-sm">Full system overview — {user?.name}</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: '#2d5c26', color: '#c9a84c', border: 'none' }}
          >⬇️ Export CSV</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {statCards.map(s => (
            <div key={s.label} className="glass rounded-2xl p-5 text-center">
              <p className="text-4xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tab nav — scrolls horizontally on mobile */}
        <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {[['complaints', '📋 Complaints'], ['appeals', `📩 Appeals${appeals.length > 0 ? ` (${appeals.filter(a=>a.status==='pending').length})` : ''}`], ['analytics', '📊 Analytics']].map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-shrink-0"
              style={activeTab === tab
                ? { background: '#2d5c26', color: '#c9a84c' }
                : { background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(45,92,38,0.12)', color: '#2d5c26' }}
            >{label}</button>
          ))}
        </div>

        {activeTab === 'complaints' && (
          <>
            {/* Search bar */}
            <div className="mb-3">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="🔍 Search by complaint no, student name, section, or keyword..."
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ border: '1.5px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.9)', color: '#1A1A1A' }}
                onFocus={e => e.target.style.borderColor = '#2d5c26'}
                onBlur={e => e.target.style.borderColor = 'rgba(45,92,38,0.15)'}
              />
            </div>

            <div className="flex gap-2 mb-5 flex-wrap items-center">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="flex-1 min-w-[130px] rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none"
                style={{ border: '1px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.9)', color: '#374151' }}
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUSES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
              <select
                value={domainFilter}
                onChange={e => setDomainFilter(e.target.value)}
                className="flex-1 min-w-[130px] rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none"
                style={{ border: '1px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.9)', color: '#374151' }}
              >
                <option value="">All Domains</option>
                {Object.entries(DOMAINS).map(([k, d]) => <option key={k} value={k}>{d.icon} {d.label}</option>)}
              </select>
              <span className="text-xs text-gray-400 font-medium w-full sm:w-auto sm:ml-auto">{filtered.length} of {complaints.length} shown</span>
            </div>

            {loading ? (
              <SkeletonList count={3} />
            ) : filtered.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-5xl mb-3">🏛️</p>
                <h3 className="font-bold text-gray-700 text-lg">No complaints in the system yet</h3>
                <p className="text-gray-500 text-sm mt-1">When students raise complaints, they'll appear here.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(c => <ComplaintCard key={c.id} complaint={c} />)}
              </div>
            )}
          </>
        )}

        {activeTab === 'appeals' && (
          <AppealsPanel appeals={appeals} loading={appealsLoading} onReviewed={() => {
            setAppealsLoading(true)
            api.get('/api/complaints/appeals/all')
              .then(r => setAppeals(r.data))
              .catch(() => toast.error('Failed to reload appeals'))
              .finally(() => setAppealsLoading(false))
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
