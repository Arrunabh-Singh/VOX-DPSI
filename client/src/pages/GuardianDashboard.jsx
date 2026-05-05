import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useComplaints } from '../hooks/useComplaints'
import { useLanguage } from '../context/LanguageContext'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import Footer from '../components/Footer'
import { SkeletonList } from '../components/SkeletonCard'
import { STATUSES } from '../utils/constants'

export default function GuardianDashboard() {
  const { user } = useAuth()
  const { complaints, loading } = useComplaints()
  const { t } = useLanguage()

  useEffect(() => { document.title = `${t('guardian.dashboard.title')} — Vox DPSI` }, [t])

  return (
    <div className="min-h-screen" style={{ background: '#eae1c4' }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Welcome card */}
        <div className="glass-dark rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{t('guardian.dashboard.welcome', { name: '' }).replace(', ', '')}</p>
              <h1 className="text-2xl font-black text-white mt-1">{user?.name}</h1>
              <p className="text-sm font-semibold mt-0.5" style={{ color: '#c9a84c' }}>
                {t('role.guardian')}
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Ward's Complaints</p>
              <p className="text-4xl font-black" style={{ color: '#c9a84c' }}>{complaints.length}</p>
            </div>
          </div>
        </div>

        {/* Complaints list header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: '#2d5c26' }}>{t('guardian.dashboard.title')}</h2>
          <span className="text-sm text-gray-500">{complaints.length} total</span>
        </div>

        {loading ? (
          <SkeletonList count={3} />
        ) : complaints.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-5xl mb-4">🌿</p>
            <h3 className="font-bold text-gray-700 text-lg mb-1">{t('guardian.dashboard.empty')}</h3>
            <p className="text-gray-500 text-sm mb-6">{t('guardian.dashboard.emptyHint')}</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {complaints.map(c => <ComplaintCard key={c.id} complaint={c} />)}
          </div>
        )}

        {/* Status legend */}
        <div className="mt-6 glass rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-3 uppercase tracking-wide" style={{ color: '#2d5c26' }}>{t('student.dashboard.statusLegend')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(STATUSES).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: val.color }} />
                <span className="text-xs text-gray-600">{t(`status.${key}`) || val.label}</span>
              </div>
            ))}
          </div>
        </div>

      </main>
      <Footer />
    </div>
  )
}
