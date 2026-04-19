import { useState } from 'react'
import { useComplaints } from '../hooks/useComplaints'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { DOMAINS, STATUSES } from '../utils/constants'

export default function SupervisorDashboard() {
  const { user } = useAuth()
  const { complaints, loading } = useComplaints()
  const [statusFilter, setStatusFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')

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
    { label: 'Total',       value: complaints.length,                                                            color: '#1B4D2B' },
    { label: 'Resolved',    value: complaints.filter(c => ['resolved','closed'].includes(c.status)).length,      color: '#16A34A' },
    { label: 'In Progress', value: complaints.filter(c => c.status === 'in_progress').length,                    color: '#4F46E5' },
    { label: 'Escalated',   value: complaints.filter(c => c.status.includes('escalated')).length,                color: '#DC2626' },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#EEF2EC' }}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header card */}
        <div className="glass-dark rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide" style={{ color: '#A7C4B0' }}>Supervisor View</p>
              <h1 className="text-2xl font-black text-white mt-1">{user?.name}</h1>
              <p className="text-sm font-semibold mt-0.5" style={{ color: '#F0B429' }}>
                {user?.house} House · {user?.section}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs" style={{ color: '#A7C4B0' }}>System Total</p>
              <p className="text-5xl font-black" style={{ color: '#F0B429' }}>{complaints.length}</p>
              <p className="text-xs" style={{ color: '#A7C4B0' }}>complaints</p>
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
            <h3 className="font-bold text-sm mb-3 uppercase tracking-wide" style={{ color: '#4A7C5C' }}>By House</h3>
            <div className="space-y-2">
              {Object.entries(houseStats).length === 0
                ? <p className="text-gray-400 text-sm">No data</p>
                : Object.entries(houseStats).map(([house, data]) => (
                  <div key={house} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 font-medium">{house}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: '#1B4D2B' }}>{data.total}</span>
                      <span className="text-xs text-gray-400"> / {data.resolved} resolved</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-3 uppercase tracking-wide" style={{ color: '#4A7C5C' }}>By Domain</h3>
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
            <h3 className="font-bold text-sm mb-3 uppercase tracking-wide" style={{ color: '#4A7C5C' }}>By Section</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
              {Object.entries(sectionStats).length === 0
                ? <p className="text-gray-400 text-sm">No data</p>
                : Object.entries(sectionStats).sort((a, b) => b[1] - a[1]).map(([sec, count]) => (
                  <div key={sec} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 font-medium">{sec}</span>
                    <span className="text-sm font-bold" style={{ color: '#1B4D2B' }}>{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap items-center">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm font-medium focus:outline-none"
            style={{ border: '1px solid rgba(27,77,43,0.2)', background: 'rgba(255,255,255,0.8)', color: '#374151' }}>
            <option value="">All Statuses</option>
            {Object.entries(STATUSES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm font-medium focus:outline-none"
            style={{ border: '1px solid rgba(27,77,43,0.2)', background: 'rgba(255,255,255,0.8)', color: '#374151' }}>
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
          <LoadingSpinner message="Loading all complaints..." />
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
      </main>
    </div>
  )
}
