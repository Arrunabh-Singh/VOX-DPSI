import { useState } from 'react'
import { useComplaints } from '../hooks/useComplaints'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { DOMAINS, STATUSES } from '../utils/constants'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function VicePrincipalDashboard() {
  const { user } = useAuth()
  const { complaints, loading, refetch } = useComplaints()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [resolveId, setResolveId] = useState(null)
  const [resolveNote, setResolveNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const filtered = complaints
    .filter(c => !statusFilter || c.status === statusFilter)
    .filter(c => !domainFilter || c.domain === domainFilter)

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => !['resolved', 'closed'].includes(c.status)).length,
    resolved: complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length,
    toPrincipal: complaints.filter(c => c.status === 'escalated_to_principal').length,
  }

  const handleResolve = async () => {
    if (!resolveId) return
    setActionLoading(true)
    try {
      await api.patch(`/api/complaints/${resolveId}/resolve`, {
        note: resolveNote.trim() || 'Complaint resolved by Vice Principal.',
      })
      toast.success('Complaint resolved successfully')
      setResolveId(null)
      setResolveNote('')
      refetch()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resolve complaint')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Navbar />

      {/* Resolve Modal */}
      {resolveId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-[#003366] rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">Resolve Complaint</h2>
              <button onClick={() => setResolveId(null)} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Resolution Note (optional)</label>
                <textarea
                  value={resolveNote}
                  onChange={e => setResolveNote(e.target.value)}
                  rows={3}
                  placeholder="Describe how the complaint was resolved..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#003366]"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setResolveId(null)}
                  className="flex-1 py-3 border border-gray-300 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={actionLoading}
                  className="flex-1 py-3 text-white rounded-xl font-semibold transition-colors disabled:opacity-50" style={{ background: '#003366' }} onMouseEnter={e => e.currentTarget.style.background='#002952'} onMouseLeave={e => e.currentTarget.style.background='#003366'}
                >
                  {actionLoading ? 'Resolving...' : 'Confirm Resolve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Vice Principal's Dashboard</h1>
            <p className="text-gray-500 text-sm">Full system overview — {user?.name}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total, color: '#003366', bg: '#EFF6FF' },
            { label: 'Pending', value: stats.pending, color: '#D97706', bg: '#FEF3C7' },
            { label: 'Resolved', value: stats.resolved, color: '#16A34A', bg: '#DCFCE7' },
            { label: 'Escalated to Principal', value: stats.toPrincipal, color: '#DC2626', bg: '#FEE2E2' },
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
            {filtered.map(c => (
              <div key={c.id} className="relative">
                {/* Anon Requested badge */}
                {c.is_anonymous_requested && (
                  <div className="absolute top-3 right-3 z-10">
                    <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-semibold">
                      Anon Requested
                    </span>
                  </div>
                )}
                <div
                  className="cursor-pointer"
                  onClick={() => navigate(`/complaints/${c.id}`)}
                >
                  <ComplaintCard complaint={c} />
                </div>
                {/* Quick resolve button for non-resolved complaints */}
                {!['resolved', 'closed'].includes(c.status) && (
                  <div className="px-4 pb-4 -mt-1">
                    <button
                      onClick={e => { e.stopPropagation(); setResolveId(c.id); setResolveNote('') }}
                      className="w-full py-2 text-white rounded-xl text-xs font-semibold transition-colors" style={{ background: '#003366' }} onMouseEnter={e => e.currentTarget.style.background='#002952'} onMouseLeave={e => e.currentTarget.style.background='#003366'}
                    >
                      ✅ Resolve
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
