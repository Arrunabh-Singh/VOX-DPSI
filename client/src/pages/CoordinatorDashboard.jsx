import { useState } from 'react'
import { useComplaints } from '../hooks/useComplaints'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { DOMAINS } from '../utils/constants'

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'escalated_to_coordinator', label: 'New' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'escalated_to_principal', label: 'To Principal' },
  { key: 'resolved', label: 'Resolved' },
]

export default function CoordinatorDashboard() {
  const { user } = useAuth()
  const { complaints, loading } = useComplaints()
  const [statusFilter, setStatusFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')

  const filtered = complaints
    .filter(c => !statusFilter || c.status === statusFilter)
    .filter(c => !domainFilter || c.domain === domainFilter)

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'escalated_to_coordinator').length,
    toPrincipal: complaints.filter(c => c.status === 'escalated_to_principal').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">Coordinator Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome, {user?.name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total, color: '#003366' },
            { label: 'Needs Attention', value: stats.pending, color: '#D97706' },
            { label: 'To Principal', value: stats.toPrincipal, color: '#DC2626' },
            { label: 'Resolved', value: stats.resolved, color: '#16A34A' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
              <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="flex gap-2 overflow-x-auto">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === f.key
                    ? 'bg-[#003366] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            value={domainFilter}
            onChange={e => setDomainFilter(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#003366]"
          >
            <option value="">All Domains</option>
            {Object.entries(DOMAINS).map(([k, d]) => (
              <option key={k} value={k}>{d.icon} {d.label}</option>
            ))}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <LoadingSpinner message="Loading complaints..." />
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
            <p className="text-5xl mb-3">📭</p>
            <h3 className="font-bold text-gray-700 text-lg">No complaints match your filters</h3>
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
