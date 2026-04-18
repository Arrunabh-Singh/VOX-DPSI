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
    total: complaints.length,
    resolved: complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length,
    pending: complaints.filter(c => !['resolved', 'closed'].includes(c.status)).length,
    toPrincipal: complaints.filter(c => c.status === 'escalated_to_principal').length,
  }

  const exportCSV = () => {
    const headers = ['Complaint No', 'Domain', 'Status', 'Student', 'Scholar No', 'Section', 'Date', 'Description']
    const rows = complaints.map(c => [
      c.complaint_no_display,
      c.domain,
      c.status,
      c.student?.name || '',
      c.student?.scholar_no || '',
      c.student?.section || '',
      new Date(c.created_at).toLocaleDateString('en-IN'),
      `"${(c.description || '').replace(/"/g, '""')}"`,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vox-dpsi-complaints-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Principal's Dashboard</h1>
            <p className="text-gray-500 text-sm">Full system overview — {user?.name}</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ⬇️ Export CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Raised', value: stats.total, color: '#003366', bg: '#EFF6FF' },
            { label: 'Resolved', value: stats.resolved, color: '#16A34A', bg: '#DCFCE7' },
            { label: 'Pending', value: stats.pending, color: '#D97706', bg: '#FEF3C7' },
            { label: 'To Principal', value: stats.toPrincipal, color: '#DC2626', bg: '#FEE2E2' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-gray-200 p-5 text-center" style={{ backgroundColor: s.bg }}>
              <p className="text-4xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
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
            Showing {filtered.length} of {complaints.length}
          </span>
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
