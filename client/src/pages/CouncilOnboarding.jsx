import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { COLORS } from '../utils/constants'
import api from '../utils/api'
import toast from 'react-hot-toast'

const SLIDES = [
  {
    key: 'welcome',
    title: 'Welcome, Council Member!',
    icon: '👋',
    content: 'Thank you for serving on the Vox DPSI Council. You play a vital role in ensuring student voices are heard and addressed promptly.'
  },
  {
    key: 'process',
    title: 'How It Works',
    icon: '📋',
    content: (
      <div className="space-y-2">
        <p><strong>1. Verify:</strong> Confirm the complaint in person with the student</p>
        <p><strong>2. In Progress:</strong> Work on resolving the issue</p>
        <p><strong>3. Resolve:</strong> Mark complete once addressed</p>
        <p><strong>4. Escalate:</strong> For serious matters, send to Coordinator</p>
      </div>
    )
  },
  {
    key: 'anonymity',
    title: 'Anonymity Policy',
    icon: '🔒',
    content: (
      <div className="space-y-2">
        <p>• Students may request anonymity. Look for the "Anon Req" badge.</p>
        <p>• Council members always see real names — this helps with follow-up.</p>
        <p>• Never reveal a student's identity without their consent.</p>
        <p>• On escalation, the student chooses whether to reveal identity.</p>
      </div>
    )
  },
  {
    key: 'sla',
    title: 'Response Commitment',
    icon: '⏰',
    content: (
      <div className="space-y-2">
        <p className="text-3xl font-black" style={{ color: COLORS.nav }}>72 Hours</p>
        <p>This is your Service Level Agreement.</p>
        <p>All complaints must receive initial action within 72 hours.</p>
        <p>Failure to act triggers automatic escalation.</p>
      </div>
    )
  },
  {
    key: 'pledge',
    title: 'Council Member Pledge',
    icon: '🤝',
    content: (
      <div className="space-y-3">
        <p>I pledge to:</p>
        <ul className="list-disc list-inside space-y-1 text-left ml-4">
          <li>Treat all complaints with confidentiality and respect</li>
          <li>Respond within the 72-hour SLA</li>
          <li>Maintain student anonymity when requested</li>
          <li>Act with integrity and impartiality</li>
        </ul>
      </div>
    )
  }
]

export default function CouncilOnboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [current, setCurrent] = useState(0)
  const [pledgeChecked, setPledgeChecked] = useState(false)
  const [loading, setLoading] = useState(false)

  const isLast = current === SLIDES.length - 1

  const handleNext = () => {
    if (isLast) {
      handleComplete()
    } else {
      setCurrent(c => c + 1)
    }
  }

  const handleBack = () => {
    setCurrent(c => Math.max(0, c - 1))
  }

  const handleComplete = async () => {
    if (!pledgeChecked) {
      return
    }
    setLoading(true)
    try {
      await api.patch('/api/users/me', { onboarding_completed: true })
      toast.success('Onboarding complete!')
      navigate('/council')
    } catch (err) {
      toast.error('Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  const slide = SLIDES[current]

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
      <div className="glass rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{slide.icon}</div>
          <h1 className="text-xl font-bold" style={{ color: COLORS.nav }}>{slide.title}</h1>
        </div>

        <div className="mb-8 text-gray-600 text-sm leading-relaxed text-center">
          {slide.content}
        </div>

        {isLast && (
          <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(45,92,38,0.04)', border: '1px solid rgba(45,92,38,0.1)' }}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={pledgeChecked}
                onChange={e => setPledgeChecked(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-gray-300"
                style={{ accentColor: COLORS.nav }}
              />
              <span className="text-sm font-medium text-gray-700">
                I have read and agree to the Council Member Pledge above.
              </span>
            </label>
          </div>
        )}

        <div className="flex gap-3">
          {current > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(45,92,38,0.1)', color: COLORS.nav }}
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={isLast && !pledgeChecked}
            className="flex-1 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
            style={{ background: COLORS.nav, color: COLORS.gold, border: 'none' }}
          >
            {loading ? 'Saving...' : isLast ? 'Begin →' : 'Next →'}
          </button>
        </div>

        <div className="flex justify-center gap-2 mt-6">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: i === current ? COLORS.nav : 'rgba(45,92,38,0.2)',
                transition: 'background 0.2s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}