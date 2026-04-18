import { useEffect, useState } from 'react'
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

  // Per-house breakdown
  const houseStats = complaints.reduce((acc, c) => {
    const house = c.student?.house || 'Unknown'
    if (!acc[house]) acc[house] = { total: 0, resolved: 0 }
    acc[house].total++
    if (c.status === 'resolved' || c.status === 'closed') acc[house].resolved++
    return acc
  }, {})

  // Per-section breakdown
  const sectionStats = complaints.reduce((acc, c) => {
    const sec = c.student?.section || 'Unknown'
    if (!acc[sec]) acc[sec] = 0
    acc[sec]++
    return acc
  }, {})

  const domainBreakdown = complaints.reduce((acc, c) => {
    acc[c.domain] = (acc[c.domain] || 0) + 1
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-[#003366] rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm font-medium uppercase tracking-wide">Supervisor View</p>
              <h1 className="text-2xl font-black mt-1">{user?.name}</h1>
              <p className="text-[#FFD700] text-sm font-semibold mt-0.5">
                {user?.house} House · {user?.section}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-blue-200 text-xs">System Total</p>
              <p className="text-5xl font-black text-[#FFD700]">{complaints.length}</p>
              <p className="text-blue-200 text-xs">complaints</p>
            </div>
          </div>
        </div>

        {/* Overall stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: complaints.length, color: '#003366' },
            { label: 'Resolved', value: complaints.filter(c => ['resolved','closed'].includes(c.status)).length, color: '#16A34A' },
            { label: 'In Progress', value: complaints.filter(c => c.status === 'in_progress').length, color: '#4F46E5' },
            { label: 'Escalated', value: complaints.filter(c => c.status.includes('escalated')).length, color: '#DC2626' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
              <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* House and Domain breakdowns */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {/* House stats */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-700 text-sm mb-3 uppercase tracking-wide">By House</h3>
            <div className="space-y-2">
              {Object.entries(houseStats).length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : Object.entries(houseStats).map(([house, data]) => (
                <div key={house} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-medium">{house}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-[#003366]">{data.total}</span>
                    <span className="text-xs text-gray-400"> / {data.resolved} resolved</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Domain breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-700 text-sm mb-3 uppercase tracking-wide">By Domain</h3>
            <div className="space-y-2">
              {Object.entries(domainBreakdown).length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : Object.entries(domainBreakdown).map(([dom, count]) => {
                const d = DOMAINS[dom] || { icon: '📋', label: dom, color: '#6B7280' }
                return (
                  <div key={dom} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: d.color }}>
                      {d.icon} {d.label}
                    </span>
                    <span className="text-sm font-bold" style={{ color: d.color }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-700 text-sm mb-3 uppercase tracking-wide">By Section</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {Object.entries(sectionStats).length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : Object.entries(sectionStats)
                .sort((a, b) => b[1] - a[1])
                .map(([sec, count]) => (
                  <div key={sec} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 font-medium">{sec}</span>
                    <span className="text-sm font-bold text-[#003366]">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap items-center">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#003366]"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUSES).map(([k, s]) => (
              <option key={k} value={k}>{s.label}</option>
            ))}
          </select>
          <select
            value={domainFilter}
            onChange={e => setDomainFilter(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#003366]"
          >
            <option value="">All Domains</option>
            {Object.entries(DOMAINS).map(([k, d]) => (
              <option key={k} value={k}>{d.icon} {d.label}</option>
            ))}
          </select>
          <span className="text-sm text-gray-400 font-medium ml-auto">
            {filtered.length} of {complaints.length}
          </span>
        </div>

        {/* Read-only note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
          <span className="text-blue-500 mt-0.5">👁️</span>
          <p className="text-blue-700 text-sm">
            <strong>Supervisor view:</strong> You can see all complaints and student names. You can add notes but cannot change complaint statuses.
          </p>
        </div>

        {/* List */}
        {loading ? (
          <LoadingSpinner message="Loading all complaints..." />
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
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
