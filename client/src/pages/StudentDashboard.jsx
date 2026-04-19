import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useComplaints } from '../hooks/useComplaints'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { STATUSES } from '../utils/constants'

export default function StudentDashboard() {
  const { user } = useAuth()
  const { complaints, loading } = useComplaints()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Welcome card */}
        <div className="glass-dark rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: '#A7C4B0' }}>Welcome back</p>
              <h1 className="text-2xl font-black text-white mt-1">{user?.name}</h1>
              {user?.scholar_no && (
                <p className="text-sm font-semibold mt-0.5" style={{ color: '#F0B429' }}>
                  Scholar No: {user.scholar_no} · {user?.section}
                </p>
              )}
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs" style={{ color: '#A7C4B0' }}>Total Complaints</p>
              <p className="text-4xl font-black" style={{ color: '#F0B429' }}>{complaints.length}</p>
            </div>
          </div>
        </div>

        {/* Raise CTA */}
        <button
          onClick={() => navigate('/raise')}
          className="w-full font-black text-lg py-5 rounded-2xl mb-6 flex items-center justify-center gap-3 transition-all"
          style={{ background: 'linear-gradient(135deg,#C9920A,#F0B429)', color: '#003366', boxShadow: '0 8px 24px rgba(201,146,10,0.3)' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = ''}
        >
          <span className="text-2xl">+</span>
          Raise a Complaint
        </button>

        {/* Complaints list header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: '#003366' }}>My Complaints</h2>
          <span className="text-sm text-gray-500">{complaints.length} total</span>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading your complaints..." />
        ) : complaints.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-5xl mb-3">📭</p>
            <h3 className="font-bold text-gray-700 text-lg">No complaints yet</h3>
            <p className="text-gray-500 text-sm mt-1">Use the button above to raise your first complaint.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {complaints.map(c => <ComplaintCard key={c.id} complaint={c} />)}
          </div>
        )}

        {/* Status legend */}
        <div className="mt-8 glass rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-3 uppercase tracking-wide" style={{ color: '#336699' }}>Status Guide</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(STATUSES).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: val.color }} />
                <span className="text-xs text-gray-600">{val.label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
