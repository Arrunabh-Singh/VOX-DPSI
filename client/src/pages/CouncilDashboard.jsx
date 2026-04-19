import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useComplaints } from '../hooks/useComplaints'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import LoadingSpinner from '../components/LoadingSpinner'

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'raised', label: 'Raised' },
  { key: 'verified', label: 'Verified' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'escalated_to_teacher', label: 'Escalated' },
  { key: 'resolved', label: 'Resolved' },
]

const statCards = [
  { key: 'assigned',           label: 'Assigned',          color: '#1B4D2B', bg: '#F0FDF4' },
  { key: 'pendingVerification',label: 'Need Verification',  color: '#D97706', bg: '#FFFBEB' },
  { key: 'escalated',          label: 'Escalated',          color: '#EA580C', bg: '#FFF7ED' },
  { key: 'resolved',           label: 'Resolved',           color: '#16A34A', bg: '#F0FDF4' },
]

export default function CouncilDashboard() {
  const { user } = useAuth()
  const { complaints, loading } = useComplaints()
  const [filter, setFilter] = useState('')

  const filtered = filter ? complaints.filter(c => c.status === filter) : complaints
  const stats = {
    assigned: complaints.length,
    pendingVerification: complaints.filter(c => c.status === 'raised').length,
    escalated: complaints.filter(c => c.status.includes('escalated')).length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  }

  return (
    <div className="min-h-screen" style={{ background: '#EEF2EC' }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black" style={{ color: '#1B4D2B' }}>Council Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Managing complaints assigned to you, {user?.name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {statCards.map(s => (
            <div key={s.key} className="glass rounded-2xl p-4 text-center">
              <p className="text-3xl font-black" style={{ color: s.color }}>{stats[s.key]}</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
              style={filter === f.key
                ? { background: '#1B4D2B', color: '#fff' }
                : { background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,77,43,0.15)', color: '#4A7C5C' }}
            >
              {f.label}
              {f.key === '' && <span className="ml-1.5 text-xs opacity-70">({complaints.length})</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner message="Loading complaints..." />
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-5xl mb-3">📭</p>
            <h3 className="font-bold text-gray-700 text-lg">No complaints here</h3>
            <p className="text-gray-500 text-sm mt-1">{filter ? 'No complaints with this status.' : 'No complaints assigned to you yet.'}</p>
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
