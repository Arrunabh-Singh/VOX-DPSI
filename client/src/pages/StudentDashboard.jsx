import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useComplaints } from '../hooks/useComplaints'
import { useLanguage } from '../context/LanguageContext'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import Footer from '../components/Footer'
import { SkeletonList } from '../components/SkeletonCard'
import { STATUSES } from '../utils/constants'
import SuggestionBox from '../components/SuggestionBox'
import DataErasureModal from '../components/DataErasureModal'

export default function StudentDashboard() {
  const { user } = useAuth()
  const { complaints, loading } = useComplaints()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [showErasure, setShowErasure] = useState(false)

  useEffect(() => { document.title = `${t('student.dashboard.title')} — Vox DPSI` }, [t])

  return (
    <div className="min-h-screen" style={{ background: '#eae1c4' }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Welcome card */}
        <div className="glass-dark rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{t('student.dashboard.welcome', { name: '' }).replace(', ', '')}</p>
              <h1 className="text-2xl font-black text-white mt-1">{user?.name}</h1>
              {user?.scholar_no && (
                <p className="text-sm font-semibold mt-0.5" style={{ color: '#c9a84c' }}>
                  {t('student.dashboard.scholar', { no: user.scholar_no })} · {user?.section}
                </p>
              )}
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Total Complaints</p>
              <p className="text-4xl font-black" style={{ color: '#c9a84c' }}>{complaints.length}</p>
            </div>
          </div>
        </div>

        {/* Raise CTA */}
        <button
          onClick={() => navigate('/raise')}
          className="w-full font-black text-lg py-5 rounded-2xl mb-6 flex items-center justify-center gap-3 transition-all"
          style={{ background: 'linear-gradient(135deg,#2d5c26,#1e3f18)', color: '#c9a84c', boxShadow: '0 8px 24px rgba(0,0,0,0.22)', border: '1px solid rgba(201,168,76,0.2)' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = ''}
        >
          <span className="text-2xl">+</span>
          {t('student.dashboard.raiseBtn')}
        </button>

        {/* Complaints list header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: '#2d5c26' }}>{t('student.dashboard.title')}</h2>
          <span className="text-sm text-gray-500">{complaints.length} total</span>
        </div>

        {loading ? (
          <SkeletonList count={3} />
        ) : complaints.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-5xl mb-4">🌿</p>
            <h3 className="font-bold text-gray-700 text-lg mb-1">{t('student.dashboard.empty')}</h3>
            <p className="text-gray-500 text-sm mb-6">{t('student.dashboard.emptyHint')}</p>
            <button
              onClick={() => navigate('/raise')}
              className="px-6 py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: '#2d5c26' }}
            >
              {t('student.dashboard.raiseBtn')}
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {complaints.map(c => <ComplaintCard key={c.id} complaint={c} />)}
          </div>
        )}

        {/* Suggestion Box */}
        <div className="mt-6">
          <SuggestionBox />
        </div>

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

        {/* Your Rights — DPDP Act 2023 (#60) */}
        <div className="mt-6 glass rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-1 uppercase tracking-wide" style={{ color: '#2d5c26' }}>Your Data Rights</h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Under the Digital Personal Data Protection Act 2023, you have the right to access,
            correct, and request deletion of your personal data.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowErasure(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              style={{
                background: 'rgba(220,38,38,0.07)',
                color: '#B91C1C',
                border: '1px solid rgba(220,38,38,0.2)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.07)'}
            >
              🗑️ Request Data Erasure
            </button>
            <a
              href="mailto:principal@dpsi.edu.in?subject=Data Access Request — Vox DPSI"
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              style={{
                background: 'rgba(37,99,235,0.07)',
                color: '#1D4ED8',
                border: '1px solid rgba(37,99,235,0.2)',
                textDecoration: 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(37,99,235,0.07)'}
            >
              📋 Request Data Access
            </a>
          </div>
        </div>
      </main>
      <Footer />

      {showErasure && <DataErasureModal onClose={() => setShowErasure(false)} />}
    </div>
  )
}
