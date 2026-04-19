import { useState } from 'react'
import { useComplaints } from '../hooks/useComplaints'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { DOMAINS, STATUSES } from '../utils/constants'

export default function PrincipalDashboard() {
  const { user } = useAuth()
  const { complaints, loading } = useComplaints()
  const [statusFilter, setStatusFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')

  const filtered = complaints
    .filter(c => !statusFilter || c.status === statusFilter)
    .filter(c => !domainFilter || c.domain === domainFilter)

  const stats = {
    total:       complaints.length,
    resolved:    complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length,
    pending:     complaints.filter(c => !['resolved', 'closed'].includes(c.status)).length,
    toPrincipal: complaints.filter(c => c.status === 'escalated_to_principal').length,
  }

  const exportCSV = () => {
    const headers = ['Complaint No', 'Domain', 'Status', 'Student', 'Scholar No', 'Section', 'Date', 'Description']
    const rows = complaints.map(c => [
      c.complaint_no_display, c.domain, c.status,
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
    { label: 'Total Raised', value: stats.total,       color: '#003366' },
    { label: 'Resolved',     value: stats.resolved,    color: '#16A34A' },
    { label: 'Pending',      value: stats.pending,     color: '#D97706' },
    { label: 'To Principal', value: stats.toPrincipal, color: '#DC2626' },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#003366' }}>Principal's Dashboard</h1>
            <p className="text-gray-500 text-sm">Full system overview — {user?.name}</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 transition-colors glass"
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.95)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
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

        <div className="flex gap-3 mb-5 flex-wrap items-center">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm font-medium focus:outline-none"
            style={{ border: '1px solid rgba(0,51,102,0.2)', background: 'rgba(255,255,255,0.8)', color: '#374151' }}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUSES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <select
            value={domainFilter}
            onChange={e => setDomainFilter(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm font-medium focus:outline-none"
            style={{ border: '1px solid rgba(0,51,102,0.2)', background: 'rgba(255,255,255,0.8)', color: '#374151' }}
          >
            <option value="">All Domains</option>
            {Object.entries(DOMAINS).map(([k, d]) => <option key={k} value={k}>{d.icon} {d.label}</option>)}
          </select>
          <span className="text-sm text-gray-400 font-medium ml-auto">Showing {filtered.length} of {complaints.length}</span>
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
