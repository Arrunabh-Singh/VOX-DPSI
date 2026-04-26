import { useState, useEffect, useMemo } from 'react'
import { useComplaints } from '../hooks/useComplaints'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import { SkeletonList } from '../components/SkeletonCard'
import Footer from '../components/Footer'

const DOMAIN_COLORS = { academics:'#3B82F6', infrastructure:'#F97316', safety:'#EF4444', personal:'#8B5CF6', behaviour:'#EAB308', other:'#6B7280' }

function TeacherAnalytics({ complaints }) {
  const resolved  = complaints.filter(c => ['resolved','closed'].includes(c.status)).length
  const pending   = complaints.filter(c => !['resolved','closed'].includes(c.status)).length
  const resRate   = complaints.length > 0 ? Math.round((resolved / complaints.length) * 100) : 0

  const resolvedList = complaints.filter(c => ['resolved','closed'].includes(c.status))
  const avgHours = resolvedList.length > 0
    ? Math.round(resolvedList.reduce((sum, c) => {
        return sum + (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 3600000
      }, 0) / resolvedList.length)
    : null

  const byDomain = complaints.reduce((acc, c) => { acc[c.domain] = (acc[c.domain] || 0) + 1; return acc }, {})
  const byStatus = { in_progress: 0, resolved: 0, escalated_to_principal: 0 }
  complaints.forEach(c => { if (byStatus[c.status] !== undefined) byStatus[c.status]++ })

  const anonCount = complaints.filter(c => c.is_anonymous_requested).length

  return (
    <div className="space-y-5">
      {/* Key metrics */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-black text-base mb-4" style={{ color: '#2d5c26' }}>Your Case Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Escalated',    value: complaints.length,                    color: '#7C3AED' },
            { label: 'Resolved',           value: resolved,                             color: '#16A34A' },
            { label: 'Pending',            value: pending,                              color: '#D97706' },
            { label: 'Resolution Rate',    value: `${resRate}%`,                       color: resRate >= 70 ? '#16A34A' : '#D97706' },
          ].map(m => (
            <div key={m.label} className="text-center p-4 rounded-xl" style={{ background: 'rgba(45,92,38,0.04)', border: '1px solid rgba(45,92,38,0.08)' }}>
              <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
        {avgHours !== null && (
          <p className="text-xs text-gray-400 mt-3">Average resolution time: <span className="font-semibold text-gray-600">{avgHours}h</span></p>
        )}
      </div>

      {/* Domain breakdown */}
      {Object.keys(byDomain).length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4 uppercase tracking-wide" style={{ color: '#2d5c26' }}>By Category</h3>
          <div className="space-y-3">
            {Object.entries(byDomain).sort((a,b) => b[1]-a[1]).map(([domain, count]) => (
              <div key={domain}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold capitalize text-gray-600">{domain}</span>
                  <span className="text-xs font-bold" style={{ color: DOMAIN_COLORS[domain] }}>{count}</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'rgba(0,0,0,0.06)' }}>
                  <div className="h-2 rounded-full" style={{ width: `${(count / complaints.length) * 100}%`, background: DOMAIN_COLORS[domain] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anonymity note */}
      {anonCount > 0 && (
        <div className="glass rounded-2xl p-5 flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="font-bold text-sm" style={{ color: '#2d5c26' }}>{anonCount} Anonymous Case{anonCount > 1 ? 's' : ''}</p>
            <p className="text-xs text-gray-500 mt-0.5">Student identities are withheld by council member decision. Handle based on complaint content alone.</p>
          </div>
        </div>
      )}

      {complaints.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-5xl mb-3">📊</p>
          <h3 className="font-bold text-gray-700 text-lg">No data yet</h3>
          <p className="text-gray-500 text-sm mt-1">Analytics will appear when complaints are escalated to you.</p>
        </div>
      )}
    </div>
  )
}

export default function TeacherDashboard() {
  const { user } = useAuth()
  const { complaints: allComplaints, loading } = useComplaints()
  const [activeTab, setActiveTab] = useState('complaints')
  useEffect(() => { document.title = 'Teacher — Vox DPSI' }, [])

  const complaints = useMemo(() => user?.section
    ? allComplaints.filter(c => !c.student?.section || c.student.section === user.section)
    : allComplaints, [allComplaints, user])

  const stats = [
    { label: 'Escalated to You', value: complaints.length,                                        color: '#EA580C' },
    { label: 'In Progress',      value: complaints.filter(c => c.status === 'in_progress').length, color: '#4F46E5' },
    { label: 'Resolved',         value: complaints.filter(c => c.status === 'resolved').length,    color: '#16A34A' },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#eae1c4' }}>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black" style={{ color: '#2d5c26' }}>Class Teacher Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome, {user?.name} — Complaints escalated to your attention</p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
          {stats.map(s => (
            <div key={s.label} className="glass rounded-2xl p-4 text-center">
              <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {[{ key: 'complaints', label: '📋 Complaints' }, { key: 'analytics', label: '📊 Analytics' }].map(t => (
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
          loading ? <SkeletonList count={3} /> :
          complaints.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-5xl mb-3">✅</p>
              <h3 className="font-bold text-gray-700 text-lg">All clear!</h3>
              <p className="text-gray-500 text-sm mt-1">No complaints escalated to you at this time.</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl px-4 py-3 mb-4 flex items-start gap-2" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <span className="text-amber-600 mt-0.5">ℹ️</span>
                <p className="text-amber-700 text-sm">Some complaints may show "Anonymous Student" if the student requested anonymity and the council member chose not to reveal their identity.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {complaints.map(c => <ComplaintCard key={c.id} complaint={c} />)}
              </div>
            </>
          )
        )}

        {activeTab === 'analytics' && <TeacherAnalytics complaints={complaints} />}
      </main>
      <Footer />
    </div>
  )
}
