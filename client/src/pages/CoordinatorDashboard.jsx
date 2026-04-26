import { useState, useEffect, useMemo } from 'react'
import { useComplaints } from '../hooks/useComplaints'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import { SkeletonList } from '../components/SkeletonCard'
import Footer from '../components/Footer'
import { DOMAINS } from '../utils/constants'
import AnalyticsDashboard from '../components/AnalyticsDashboard'

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'escalated_to_coordinator', label: 'New' },
  { key: 'in_progress',              label: 'In Progress' },
  { key: 'escalated_to_principal',   label: 'To Principal' },
  { key: 'resolved',                 label: 'Resolved' },
]

export default function CoordinatorDashboard() {
  const { user } = useAuth()
  const { complaints, loading } = useComplaints()
  const [statusFilter, setStatusFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [activeTab, setActiveTab] = useState('complaints')
  useEffect(() => { document.title = 'Coordinator — Vox DPSI' }, [])

  const filtered = useMemo(() => complaints
    .filter(c => !statusFilter || c.status === statusFilter)
    .filter(c => !domainFilter || c.domain === domainFilter),
  [complaints, statusFilter, domainFilter])

  const stats = [
    { label: 'Total',           value: complaints.length,                                                      color: '#2d5c26' },
    { label: 'Needs Attention', value: complaints.filter(c => c.status === 'escalated_to_coordinator').length, color: '#D97706' },
    { label: 'To Principal',    value: complaints.filter(c => c.status === 'escalated_to_principal').length,   color: '#DC2626' },
    { label: 'Resolved',        value: complaints.filter(c => c.status === 'resolved').length,                 color: '#16A34A' },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#eae1c4' }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black" style={{ color: '#2d5c26' }}>Coordinator Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome, {user?.name}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
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
          <>
            <div className="flex gap-3 mb-5 flex-wrap">
              <div className="flex gap-2 overflow-x-auto">
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                    style={statusFilter === f.key
                      ? { background: '#2d5c26', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(45,92,38,0.12)', color: '#2d5c26' }}
                  >{f.label}</button>
                ))}
              </div>
              <select
                value={domainFilter}
                onChange={e => setDomainFilter(e.target.value)}
                className="rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none"
                style={{ border: '1px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.8)', color: '#2d5c26' }}
              >
                <option value="">All Domains</option>
                {Object.entries(DOMAINS).map(([k, d]) => <option key={k} value={k}>{d.icon} {d.label}</option>)}
              </select>
              <span className="text-xs text-gray-400 font-medium ml-auto self-center">{filtered.length} of {complaints.length}</span>
            </div>

            {loading ? (
              <SkeletonList count={3} />
            ) : filtered.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-5xl mb-3">📭</p>
                <h3 className="font-bold text-gray-700 text-lg">No complaints match your filters</h3>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(c => <ComplaintCard key={c.id} complaint={c} />)}
              </div>
            )}
          </>
        )}

        {activeTab === 'analytics' && <AnalyticsDashboard complaints={complaints} />}
      </main>
      <Footer />
    </div>
  )
}
