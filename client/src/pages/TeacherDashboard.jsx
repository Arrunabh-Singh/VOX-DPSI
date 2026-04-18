import { useState } from 'react'
import { useComplaints } from '../hooks/useComplaints'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const { complaints, loading } = useComplaints()

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">Class Teacher Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Welcome, {user?.name} — Complaints escalated to your attention
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-black text-orange-600">{complaints.length}</p>
            <p className="text-xs text-gray-500 font-medium mt-1">Escalated to You</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-black text-indigo-600">
              {complaints.filter(c => c.status === 'in_progress').length}
            </p>
            <p className="text-xs text-gray-500 font-medium mt-1">In Progress</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-black text-green-600">
              {complaints.filter(c => c.status === 'resolved').length}
            </p>
            <p className="text-xs text-gray-500 font-medium mt-1">Resolved</p>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading escalated complaints..." />
        ) : complaints.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
            <p className="text-5xl mb-3">✅</p>
            <h3 className="font-bold text-gray-700 text-lg">All clear!</h3>
            <p className="text-gray-500 text-sm mt-1">No complaints escalated to you at this time.</p>
          </div>
        ) : (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">ℹ️</span>
              <p className="text-amber-700 text-sm">
                Some complaints may show "Anonymous Student" if the student requested anonymity and the council member chose not to reveal their identity.
              </p>
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
