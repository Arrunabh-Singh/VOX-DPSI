import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useComplaints } from '../hooks/useComplaints'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import Footer from '../components/Footer'
import { SkeletonList } from '../components/SkeletonCard'
import api from '../utils/api'

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'raised', label: 'Raised' },
  { key: 'verified', label: 'Verified' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'escalated_to_teacher', label: 'Escalated' },
  { key: 'resolved', label: 'Resolved' },
]

// ── Council Performance Score ──────────────────────────────────────────────
function calcScore({ resolved, assigned, avgHours, verifyRate }) {
  if (assigned === 0) return 0
  const resolutionScore = Math.min((resolved / Math.max(assigned, 1)) * 40, 40)
  const verifyScore     = Math.min(verifyRate * 25, 25)
  const speedScore      = avgHours <= 24 ? 20 : avgHours <= 48 ? 14 : avgHours <= 72 ? 8 : 3
  const activityScore   = Math.min(assigned * 2, 15)
  return Math.round(resolutionScore + verifyScore + speedScore + activityScore)
}

function ScoreRing({ score }) {
  const radius = 52
  const circ   = 2 * Math.PI * radius
  const fill   = (score / 100) * circ
  const color  = score >= 80 ? '#16A34A' : score >= 60 ? '#c9a84c' : score >= 40 ? '#F97316' : '#DC2626'
  const label  = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work'
  return (
    <div className="flex flex-col items-center">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(45,92,38,0.1)" strokeWidth="12" />
        <circle cx="65" cy="65" r={radius} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 65 65)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        <text x="65" y="60" textAnchor="middle" fontSize="26" fontWeight="900" fill={color}>{score}</text>
        <text x="65" y="76" textAnchor="middle" fontSize="11" fill="#6B7280">/100</text>
      </svg>
      <span className="text-sm font-bold mt-1" style={{ color }}>{label}</span>
    </div>
  )
}

function CouncilAnalytics({ complaints, user }) {
  const myComplaints = useMemo(() =>
    complaints.filter(c => c.assigned_council_member_id === user?.id), [complaints, user?.id])

  const resolved   = myComplaints.filter(c => ['resolved','closed'].includes(c.status)).length
  const verified   = myComplaints.filter(c => c.status !== 'raised').length
  const escalated  = myComplaints.filter(c => c.status.includes('escalated')).length
  const inProgress = myComplaints.filter(c => c.status === 'in_progress').length
  const verifyRate = myComplaints.length > 0 ? verified / myComplaints.length : 0

  // Avg resolution time (hours) for resolved ones
  const resolvedList = myComplaints.filter(c => ['resolved','closed'].includes(c.status))
  const avgHours = resolvedList.length > 0
    ? resolvedList.reduce((sum, c) => {
        const diff = new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()
        return sum + diff / 3600000
      }, 0) / resolvedList.length
    : 99

  const score = calcScore({ resolved, assigned: myComplaints.length, avgHours, verifyRate })

  const domainBreakdown = myComplaints.reduce((acc, c) => {
    acc[c.domain] = (acc[c.domain] || 0) + 1; return acc
  }, {})
  const domainColors = { academics:'#3B82F6', infrastructure:'#F97316', safety:'#EF4444', personal:'#8B5CF6', behaviour:'#EAB308', other:'#6B7280' }

  return (
    <div className="space-y-5">
      {/* Score card */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-black text-lg" style={{ color: '#2d5c26' }}>Your Performance Score</h3>
            <p className="text-xs text-gray-400 mt-0.5">Based on your resolution rate, speed, verify rate & activity</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: 'rgba(201,168,76,0.15)', color: '#92400E' }}>
            Visible to you & Principal only
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
          <ScoreRing score={score} />
          <div className="grid grid-cols-2 gap-4 flex-1">
            {[
              { label: 'Assigned to me', value: myComplaints.length, color: '#2d5c26' },
              { label: 'Resolved',       value: resolved,             color: '#16A34A' },
              { label: 'Verified',       value: verified,             color: '#3B82F6' },
              { label: 'Escalated',      value: escalated,            color: '#F97316' },
              { label: 'Avg Resolution', value: avgHours < 99 ? `${Math.round(avgHours)}h` : '—', color: '#8B5CF6' },
              { label: 'Verify Rate',    value: `${Math.round(verifyRate * 100)}%`,                color: '#c9a84c' },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: 'rgba(45,92,38,0.04)', border: '1px solid rgba(45,92,38,0.08)' }}>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="glass rounded-2xl p-5">
        <h3 className="font-bold text-sm mb-4 uppercase tracking-wide" style={{ color: '#2d5c26' }}>Score Breakdown</h3>
        {[
          { label: 'Resolution Rate',   score: Math.round(Math.min((resolved / Math.max(myComplaints.length, 1)) * 40, 40)),  max: 40,  tip: `${resolved} resolved of ${myComplaints.length}` },
          { label: 'Verify Rate',       score: Math.round(Math.min(verifyRate * 25, 25)),                                      max: 25,  tip: `${Math.round(verifyRate*100)}% verified in person` },
          { label: 'Response Speed',    score: avgHours <= 24 ? 20 : avgHours <= 48 ? 14 : avgHours <= 72 ? 8 : 3,            max: 20,  tip: avgHours < 99 ? `Avg ${Math.round(avgHours)}h` : 'No resolved cases yet' },
          { label: 'Activity Level',    score: Math.round(Math.min(myComplaints.length * 2, 15)),                              max: 15,  tip: `${myComplaints.length} complaints handled` },
        ].map(b => (
          <div key={b.label} className="mb-3 last:mb-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-600">{b.label}</span>
              <span className="text-xs font-bold" style={{ color: '#2d5c26' }}>{b.score} / {b.max}</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'rgba(45,92,38,0.1)' }}>
              <div className="h-2 rounded-full transition-all" style={{ width: `${(b.score/b.max)*100}%`, background: '#2d5c26' }} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{b.tip}</p>
          </div>
        ))}
      </div>

      {/* Domain breakdown */}
      {Object.keys(domainBreakdown).length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4 uppercase tracking-wide" style={{ color: '#2d5c26' }}>By Domain</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(domainBreakdown).map(([domain, count]) => (
              <div key={domain} className="text-center p-3 rounded-xl" style={{ background: domainColors[domain] + '15', border: `1px solid ${domainColors[domain]}30` }}>
                <p className="text-2xl font-black" style={{ color: domainColors[domain] }}>{count}</p>
                <p className="text-xs font-semibold capitalize mt-0.5" style={{ color: domainColors[domain] }}>{domain}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {myComplaints.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-5xl mb-3">📊</p>
          <h3 className="font-bold text-gray-700 text-lg">No data yet</h3>
          <p className="text-gray-500 text-sm mt-1">Your analytics will populate as complaints are assigned to you.</p>
        </div>
      )}
    </div>
  )
}

export default function CouncilDashboard() {
  const { user } = useAuth()
  const { complaints, loading } = useComplaints()
  const [filter, setFilter] = useState('')
  const [activeTab, setActiveTab] = useState('complaints')
  useEffect(() => { document.title = 'Council — Vox DPSI' }, [])

  // Sort: overdue first, then urgent, then by status priority, then newest
  const OVERDUE_THRESHOLD = 48 * 3600000
  const statusPriority = { raised: 0, verified: 1, in_progress: 2, escalated_to_teacher: 3, escalated_to_coordinator: 4, resolved: 5, closed: 6 }
  const sorted = useMemo(() => [...complaints].sort((a, b) => {
    const aOverdue = !['resolved','closed'].includes(a.status) && (Date.now() - new Date(a.updated_at || a.created_at).getTime()) > OVERDUE_THRESHOLD
    const bOverdue = !['resolved','closed'].includes(b.status) && (Date.now() - new Date(b.updated_at || b.created_at).getTime()) > OVERDUE_THRESHOLD
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
    if ((a.priority === 'urgent') !== (b.priority === 'urgent')) return a.priority === 'urgent' ? -1 : 1
    const sp = (statusPriority[a.status] ?? 9) - (statusPriority[b.status] ?? 9)
    if (sp !== 0) return sp
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }), [complaints])

  const filtered = useMemo(() => filter ? sorted.filter(c => c.status === filter) : sorted, [sorted, filter])

  const stats = useMemo(() => ({
    assigned:            complaints.length,
    pendingVerification: complaints.filter(c => c.status === 'raised').length,
    escalated:           complaints.filter(c => c.status.includes('escalated')).length,
    resolved:            complaints.filter(c => c.status === 'resolved').length,
  }), [complaints])

  const statCards = [
    { key: 'assigned',            label: 'Assigned',         color: '#1B4D2B', bg: '#F0FDF4' },
    { key: 'pendingVerification', label: 'Need Verification', color: '#D97706', bg: '#FFFBEB' },
    { key: 'escalated',           label: 'Escalated',         color: '#EA580C', bg: '#FFF7ED' },
    { key: 'resolved',            label: 'Resolved',          color: '#16A34A', bg: '#F0FDF4' },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#eae1c4' }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-5">
          <h1 className="text-2xl font-black" style={{ color: '#2d5c26' }}>Council Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome, {user?.name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          {statCards.map(s => (
            <div key={s.key} className="glass rounded-2xl p-4 text-center">
              <p className="text-3xl font-black" style={{ color: s.color }}>{stats[s.key]}</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {[{ key: 'complaints', label: '📋 Complaints' }, { key: 'analytics', label: '📊 My Analytics' }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={activeTab === t.key
                ? { background: '#2d5c26', color: '#c9a84c' }
                : { background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(45,92,38,0.12)', color: '#2d5c26' }}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'complaints' && (
          <>
            {/* Filter tabs */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {STATUS_FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                  style={filter === f.key
                    ? { background: '#2d5c26', color: '#c9a84c' }
                    : { background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(45,92,38,0.12)', color: '#2d5c26' }}>
                  {f.label}
                  {f.key === '' && <span className="ml-1.5 text-xs opacity-70">({complaints.length})</span>}
                </button>
              ))}
            </div>

            {loading ? (
              <SkeletonList count={3} />
            ) : filtered.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-5xl mb-3">✅</p>
                <h3 className="font-bold text-gray-700 text-lg">All caught up</h3>
                <p className="text-gray-500 text-sm mt-1">{filter ? 'No complaints with this status.' : 'Nothing assigned to you yet.'}</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(c => <ComplaintCard key={c.id} complaint={c} />)}
              </div>
            )}
          </>
        )}

        {activeTab === 'analytics' && (
          <CouncilAnalytics complaints={complaints} user={user} />
        )}
      </main>
      <Footer />
    </div>
  )
}
