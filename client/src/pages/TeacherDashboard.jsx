import { useComplaints } from '../hooks/useComplaints'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const { complaints, loading } = useComplaints()

  const stats = [
    { label: 'Escalated to You', value: complaints.length,                                        color: '#EA580C' },
    { label: 'In Progress',      value: complaints.filter(c => c.status === 'in_progress').length, color: '#4F46E5' },
    { label: 'Resolved',         value: complaints.filter(c => c.status === 'resolved').length,    color: '#16A34A' },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#EEF2EC' }}>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black" style={{ color: '#1B4D2B' }}>Class Teacher Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome, {user?.name} — Complaints escalated to your attention</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map(s => (
            <div key={s.label} className="glass rounded-2xl p-4 text-center">
              <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner message="Loading escalated complaints..." />
        ) : complaints.length === 0 ? (
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
        )}
      </main>
    </div>
  )
}
