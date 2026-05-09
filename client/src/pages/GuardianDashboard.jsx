import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import Footer from '../components/Footer'
import { SkeletonList } from '../components/SkeletonCard'
import { STATUSES } from '../utils/constants'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function GuardianDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [children, setChildren] = useState([])
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [scholarNo, setScholarNo] = useState('')
  const [vpcStatus, setVpcStatus] = useState('')

  // Redirect if not guardian
  if (user && user.role !== 'guardian') {
    navigate('/')
    return null
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch linked children
      const { data: childData } = await api.get('/api/guardian/my-children')
      setChildren(childData || [])

      // Fetch complaints for linked children
      const { data: compData } = await api.get('/api/guardian/complaints')
      setComplaints(compData || [])

      // Get VPC status
      if (user?.vpc_status) {
        setVpcStatus(user.vpc_status)
      }
    } catch (err) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleLink = async (e) => {
    e.preventDefault()
    if (!scholarNo.trim()) return toast.error('Enter scholar number')
    try {
      await api.post('/api/guardian/link', { scholar_no: scholarNo.trim() })
      toast.success('Successfully linked to student!')
      setScholarNo('')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to link')
    }
  }

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
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Linked Children</p>
              <p className="text-4xl font-black" style={{ color: '#c9a84c' }}>{children.length}</p>
            </div>
          </div>
        </div>

        {/* VPC Status */}
        {vpcStatus && (
          <div className="glass rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <p className="text-sm font-semibold">Parental Consent Status</p>
              <p className={`text-xs ${vpcStatus === 'approved' ? 'text-green-700' : 'text-orange-700'}`}>
                {vpcStatus === 'approved' ? '✓ Verified' : vpcStatus === 'pending' ? '⏳ Pending' : vpcStatus}
              </p>
            </div>
          </div>
        )}

        {/* Link to Student */}
        {children.length === 0 && (
          <div className="glass rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold mb-3" style={{ color: '#2d5c26' }}>Link to Your Child</h2>
            <p className="text-sm text-gray-600 mb-4">Enter your child's scholar number to link your account and view their complaints.</p>
            <form onSubmit={handleLink} className="flex gap-2">
              <input
                value={scholarNo}
                onChange={e => setScholarNo(e.target.value)}
                placeholder="e.g. 5001"
                className="flex-1 rounded-xl px-3 py-2 text-sm border focus:outline-none"
                style={{ borderColor: '#2d5c26', border: '1.5px solid' }}
              />
              <button
                type="submit"
                disabled={linking}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: '#2d5c26', border: 'none' }}
              >
                {linking ? 'Linking...' : 'Link'}
              </button>
            </form>
          </div>
        )}

        {/* Children Info */}
        {children.length > 0 && (
          <div className="glass rounded-2xl p-4 mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: '#2d5c26' }}>Linked Student</h3>
            {children.map(child => (
              <div key={child.id} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: 'rgba(45,92,38,0.05)' }}>
                <div>
                  <p className="font-bold text-sm">{child.name}</p>
                  <p className="text-xs text-gray-500">Scholar No: {child.scholar_no} · Section: {child.section} · House: {child.house}</p>
                </div>
              </div>
            ))}
          </div>
        )}

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
