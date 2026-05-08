import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import Navbar from '../components/Navbar'
import FileUpload from '../components/FileUpload'
import RichTextEditor from '../components/RichTextEditor'
import { DOMAINS } from '../utils/constants'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { isSuspiciousDescription } from '../utils/spamCheck'

const DPS_SECTIONS = [
  'XII A', 'XII B', 'XII C', 'XII D', 'XII E', 'XII F', 'XII G',
  'XI A', 'XI B', 'XI C', 'XI D', 'XI E', 'XI F', 'XI G',
  'X A', 'X B', 'X C', 'X D',
  'IX A', 'IX B', 'IX C', 'IX D',
  'VIII A', 'VIII B', 'VIII C',
  'VII A', 'VII B', 'VII C',
  'VI A', 'VI B', 'VI C',
]

const DPS_HOUSES = ['Prithvi', 'Agni', 'Akash', 'Vayu']

const DRAFT_KEY = 'vox_complaint_draft'

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') } catch { return null }
}
function saveDraft(data) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, _saved: Date.now() })) } catch {}
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch {}
}

export default function RaiseComplaint() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()
  useEffect(() => { document.title = `${t('raise.title')} — Vox DPSI` }, [t])

  // Restore from draft on first mount
  const draft = loadDraft()
  const [domain, setDomain]                   = useState(draft?.domain || '')
  const [domainTemplate, setDomainTemplate]   = useState(null)
  const [description, setDescription]         = useState(draft?.description || '')
  const [isAnonymous, setIsAnonymous]         = useState(draft?.isAnonymous || false)
  const [attachmentUrl, setAttachmentUrl]     = useState(draft?.attachmentUrl || '')
  const [priority, setPriority]               = useState(draft?.priority || 'normal')
  const [respondentType, setRespondentType]   = useState(draft?.respondentType || 'student')
  const [loading, setLoading]                 = useState(false)
  const [success, setSuccess]                 = useState(null)
  const [section, setSection]                 = useState(draft?.section || user?.section || '')
  const [spamWarning, setSpamWarning]         = useState(false)
  // #4 Duplicate Detection — modal state
  const [duplicateWarning, setDuplicateWarning] = useState(null) // { existing: [...] }
  const [house, setHouse]                     = useState(draft?.house || user?.house || '')
  const [draftRestored, setDraftRestored]     = useState(!!draft && !!draft.description)

  // Fetch workflow template when domain changes (#8)
  useEffect(() => {
    if (!domain) { setDomainTemplate(null); return }
    api.get(`/api/workflow-templates/${domain}`)
      .then(r => setDomainTemplate(r.data || null))
      .catch(() => setDomainTemplate(null))
  }, [domain])

  // Auto-save draft 800 ms after any field change
  useEffect(() => {
    if (success) return // don't save after submit
    const t = setTimeout(() => {
      saveDraft({ domain, description, isAnonymous, attachmentUrl, priority, respondentType, section, house })
    }, 800)
    return () => clearTimeout(t)
  }, [domain, description, isAnonymous, attachmentUrl, priority, respondentType, section, house, success])

  const RESPONDENT_OPTIONS = [
    { key: 'student',            label: '👤 Another student',       desc: 'Peer conflict, bullying, behaviour' },
    { key: 'teaching_staff',     label: '👨‍🏫 Teacher / academic staff', desc: 'Classroom conduct, grading, academics' },
    { key: 'non_teaching_staff', label: '🧹 Non-teaching staff',    desc: 'Admin, housekeeping, support staff' },
    { key: 'council_member',     label: '📛 Council member',        desc: 'Complaint about a council member' },
    { key: 'school_policy',      label: '📜 School policy / system', desc: 'Rules, infrastructure, processes' },
  ]

  // Core submit logic — shared by first attempt and force-submit
  const doSubmit = async (force = false) => {
    setLoading(true)
    try {
      setSpamWarning(false)
      // If student updated their house/section, sync to profile
      if ((house && house !== user?.house) || (section && section !== user?.section)) {
        const updates = {}
        if (house && house !== user?.house) updates.house = house
        if (section && section !== user?.section) updates.section = section
        await api.patch('/api/users/me', updates).catch(() => {}) // fire-and-forget
      }

      const sanitizedDescription = DOMPurify.sanitize(description, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
      const res = await api.post('/api/complaints', {
        domain, description: sanitizedDescription, priority,
        is_anonymous_requested: isAnonymous,
        attachment_url: attachmentUrl || undefined,
        respondent_type: respondentType,
        ...(force ? { force: true } : {}),
      })
      clearDraft()
      setDuplicateWarning(null)
      setSpamWarning(false)
      setSuccess(res.data)
    } catch (err) {
      // #4 Duplicate detection — show modal, don't dismiss with a toast
      if (err.response?.status === 409 && err.response?.data?.duplicate) {
        setDuplicateWarning(err.response.data)
      } else {
        toast.error(err.response?.data?.error || 'Failed to submit complaint')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!domain) return toast.error('Please select a domain')
    if (description.length < 50) return toast.error('Description must be at least 50 characters')
    if (isSuspiciousDescription(description)) {
      setSpamWarning(true)
      return
    }
    await doSubmit(false)
  }

  if (success) {
    const isPoshPocso = !!success.posh_pocso_type
    const isCouncilMemberComplaint = !isPoshPocso && success.respondent_type === 'council_member'
    const isStaffRouted = !isPoshPocso && !isCouncilMemberComplaint && success.routed_to === 'coordinator'

    return (
      <div className="min-h-screen" style={{ background: '#eae1c4' }}>
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="glass-modal rounded-2xl p-10">
            {isPoshPocso ? (
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: '#FEE2E2' }}>
                <span className="text-4xl">🔴</span>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: '#DCFCE7' }}>
                <span className="text-4xl">✅</span>
              </div>
            )}
            <h2 className="text-2xl font-black mb-2" style={{ color: isPoshPocso ? '#991B1B' : '#2d5c26' }}>
              {isPoshPocso ? 'You are safe. We have you.' : 'We heard you.'}
            </h2>

            {isPoshPocso ? (
              <div className="rounded-xl p-4 mb-5 text-left" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <p className="text-red-800 font-bold text-sm mb-1">🔴 {success.posh_pocso_type} Protocol Activated</p>
                <p className="text-red-700 text-sm">Your complaint has been routed directly to the Principal and Internal Committee — bypassing all student handlers. Your identity is protected. A response must be provided within 7 days by law.</p>
              </div>
            ) : isCouncilMemberComplaint ? (
              <div className="rounded-xl p-4 mb-5 text-left" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <p className="text-orange-800 font-bold text-sm mb-1">📛 Conflict of Interest — Routed to Coordinator</p>
                <p className="text-orange-700 text-sm">Because this complaint is about a council member, it has been sent directly to the coordinator. No council member can view or handle this complaint. Your identity is protected.</p>
              </div>
            ) : isStaffRouted ? (
              <div className="rounded-xl p-4 mb-5 text-left" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <p className="text-blue-800 font-bold text-sm mb-1">📋 Routed to Coordinator</p>
                <p className="text-blue-700 text-sm">Because this complaint involves a staff member or school policy, it has been sent directly to the coordinator for handling.</p>
              </div>
            ) : (
              <p className="text-gray-500 mb-5">Your concern has been received and is being looked into. You're not alone in this.</p>
            )}

            <div className="rounded-xl p-5 mb-6 glass-dark">
              <p className="text-sm font-medium mb-1" style={{ color: '#A7C4B0' }}>Your complaint number</p>
              <p className="font-black text-4xl tracking-wider" style={{ color: '#c9a84c' }}>{success.complaint_no_display}</p>
            </div>

            {isAnonymous && !isPoshPocso && (
              <div className="rounded-xl p-4 mb-6 text-left" style={{ background: '#FAF5FF', border: '1px solid #DDD6FE' }}>
                <p className="text-purple-800 font-semibold text-sm">🔒 Anonymity Requested</p>
                <p className="text-purple-600 text-sm mt-1">Your council member can see your name. Anonymity applies to further escalations.</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-3 rounded-xl font-semibold text-gray-600 transition-colors"
                style={{ border: '1.5px solid #E5E7EB' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >{t('common.back')}</button>
              <button
                onClick={() => navigate(`/complaints/${success.id}`)}
                className="flex-1 py-3 text-white rounded-xl font-semibold"
                style={{ background: isPoshPocso ? 'linear-gradient(135deg,#991B1B,#7F1D1D)' : 'linear-gradient(135deg,#2d5c26,#1e3f18)' }}
              >{t('detail.title')}</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#eae1c4' }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold mb-4 px-3 py-2 rounded-xl transition-all"
            style={{ color: '#2d5c26', background: 'rgba(45,92,38,0.07)', border: '1px solid rgba(45,92,38,0.12)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(45,92,38,0.13)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(45,92,38,0.07)'}
          >
            <span style={{ fontSize: '16px' }}>←</span> Back to Dashboard
          </button>
          <h1 className="text-2xl font-black" style={{ color: '#2d5c26' }}>📋 {t('raise.title')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">You're safe here. Fill in as much or as little as you're comfortable with — your concern will be taken seriously.</p>
        </div>

        {/* Draft restored notice */}
        {draftRestored && (
          <div
            className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 mb-1"
            style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
          >
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <span>💾</span>
              <span><strong>Draft restored</strong> — we saved your progress from last time.</span>
            </div>
            <button
              type="button"
              onClick={() => { clearDraft(); setDomain(''); setDescription(''); setIsAnonymous(false); setAttachmentUrl(''); setPriority('normal'); setRespondentType('student'); setDraftRestored(false) }}
              className="text-xs font-semibold text-amber-600 hover:text-amber-800 flex-shrink-0"
            >
              Discard
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Domain */}
          <div className="glass rounded-2xl p-6">
            <label className="block text-sm font-bold mb-1" style={{ color: '#2d5c26' }}>
              What area does this relate to? <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">Pick the closest match — you can explain the details below.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(DOMAINS).map(([key, d]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDomain(key)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-semibold"
                  style={domain === key
                    ? { borderColor: '#2d5c26', background: '#F0FDF4', color: '#2d5c26' }
                    : { borderColor: '#E5E7EB', color: '#6B7280' }}
                >
                  <span>{d.icon}</span><span>{t(`domain.${key}`) || d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* #8 Workflow template hint — show SLA / urgent info for selected domain */}
          {domain && domainTemplate && domainTemplate.is_active && (
            <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
              style={{ background: domainTemplate.auto_urgent ? 'rgba(220,38,38,0.05)' : 'rgba(45,92,38,0.04)', border: `1.5px solid ${domainTemplate.auto_urgent ? 'rgba(220,38,38,0.2)' : 'rgba(45,92,38,0.12)'}` }}>
              <span className="text-base flex-shrink-0 mt-0.5">{domainTemplate.auto_urgent ? '⚡' : 'ℹ️'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold mb-0.5" style={{ color: domainTemplate.auto_urgent ? '#DC2626' : '#2d5c26' }}>
                  {domainTemplate.auto_urgent ? 'This type of complaint is treated as URGENT' : `Expected resolution: within ${domainTemplate.sla_override_hours || 72} hours`}
                </p>
                {domainTemplate.description && (
                  <p className="text-xs text-gray-500 leading-relaxed">{domainTemplate.description}</p>
                )}
              </div>
            </div>
          )}

          {/* Respondent Type — who is this complaint about? */}
          <div className="glass rounded-2xl p-6">
            <label className="block text-sm font-bold mb-1" style={{ color: '#2d5c26' }}>
              Who is this complaint about? <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">This determines who handles your complaint.</p>
            <div className="space-y-2">
              {RESPONDENT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRespondentType(opt.key)}
                  className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left"
                  style={respondentType === opt.key
                    ? { borderColor: '#2d5c26', background: '#F0FDF4' }
                    : { borderColor: '#E5E7EB', background: 'transparent' }}
                >
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: respondentType === opt.key ? '#2d5c26' : '#374151' }}>{opt.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
                    style={{ borderColor: respondentType === opt.key ? '#2d5c26' : '#D1D5DB' }}>
                    {respondentType === opt.key && <div className="w-2 h-2 rounded-full" style={{ background: '#2d5c26' }} />}
                  </div>
                </button>
              ))}
            </div>
            {/* Warning for staff complaints */}
            {['teaching_staff', 'non_teaching_staff'].includes(respondentType) && (
              <div className="mt-3 rounded-xl px-4 py-2.5 flex items-start gap-2" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <span className="text-blue-500 mt-0.5">ℹ️</span>
                <span className="text-blue-700 text-xs">Complaints about staff are routed directly to the coordinator — your council member will not see this complaint.</span>
              </div>
            )}
            {respondentType === 'council_member' && (
              <div className="mt-3 rounded-xl px-4 py-2.5 flex items-start gap-2" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                <span className="mt-0.5">⚠️</span>
                <span className="text-amber-800 text-xs">Complaints about council members are routed directly to the coordinator to prevent conflict of interest.</span>
              </div>
            )}
          </div>

          {/* House & Section — compact chip design */}
          <div className="glass rounded-2xl p-4">
            <label className="block text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#2d5c26' }}>
              Your House &amp; Class
            </label>
            {/* House chips — all 4 in one row */}
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-1.5">House</p>
              <div className="flex gap-2">
                {DPS_HOUSES.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHouse(h)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border"
                    style={house === h
                      ? { borderColor: '#c9a84c', background: '#FEF9EC', color: '#92400E' }
                      : { borderColor: '#E5E7EB', color: '#6B7280', background: 'transparent' }}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
            {/* Section — compact pill grid */}
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Class / Section</p>
              <div className="flex flex-wrap gap-1.5">
                {DPS_SECTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSection(s)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium transition-all border"
                    style={section === s
                      ? { borderColor: '#2d5c26', background: 'rgba(45,92,38,0.1)', color: '#2d5c26', fontWeight: '700' }
                      : { borderColor: '#E5E7EB', color: '#6B7280', background: 'transparent' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="glass rounded-2xl p-6">
            <label className="block text-sm font-bold mb-1" style={{ color: '#2d5c26' }}>
              {t('raise.desc.label')} <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">Write in your own words. There's no wrong way to say it — include as much detail as you feel comfortable sharing.</p>
            <RichTextEditor
              value={description}
              onChange={(value) => {
                setDescription(value)
                setSpamWarning(false)
              }}
              placeholder={t('raise.desc.placeholder')}
              rows={5}
              minLength={50}
              maxLength={1000}
            />
          </div>

          {/* Priority */}
          <div className="glass rounded-2xl p-6">
            <label className="block text-sm font-bold mb-3" style={{ color: '#2d5c26' }}>Priority</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'normal', label: '🟢 Normal', desc: 'General issue, non-time-sensitive' },
                { key: 'urgent', label: '🟡 Urgent', desc: 'Needs attention within 24 hours' },
              ].map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPriority(p.key)}
                  className="p-4 rounded-xl border-2 text-left transition-all"
                  style={priority === p.key
                    ? { borderColor: '#c9a84c', background: '#FFFBEB', boxShadow: '0 0 0 1px #c9a84c' }
                    : { borderColor: '#E5E7EB', background: 'transparent' }}
                >
                  <p className="font-bold text-sm text-gray-800">{p.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Attachment */}
          <div className="glass rounded-2xl p-6">
            <label className="block text-sm font-bold mb-3" style={{ color: '#2d5c26' }}>
              Attachment <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <FileUpload onUpload={(url) => setAttachmentUrl(url)} label="Upload image, PDF, or document" />
          </div>

          {/* Anonymity toggle */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: '#2d5c26' }}>{t('raise.anon.label')}</p>
                <p className="text-xs text-gray-500 mt-1">{t('raise.anon.hint')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
                style={{ background: isAnonymous ? '#2d5c26' : '#D1D5DB' }}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isAnonymous ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            {isAnonymous && (
              <div className="mt-3 rounded-xl px-4 py-2.5 flex items-center gap-2" style={{ background: '#FAF5FF' }}>
                <span className="text-purple-600">🔒</span>
                <span className="text-purple-700 text-xs font-medium">Anonymity will be requested</span>
              </div>
            )}
          </div>

          {/* Submit */}
          {spamWarning && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A' }}
            >
              <p className="text-sm font-bold mb-3" style={{ color: '#92400E' }}>
                Your description looks unusual. Are you sure it's clear enough for the council to act on?
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => doSubmit(false)}
                  disabled={loading}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-black transition-all disabled:opacity-60"
                  style={{ background: '#D97706', color: '#FFFBEB' }}
                >
                  {loading ? 'Submitting...' : 'Submit Anyway'}
                </button>
                <button
                  type="button"
                  onClick={() => setSpamWarning(false)}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all"
                  style={{ background: 'transparent', color: '#92400E', border: '1.5px solid #FCD34D' }}
                >
                  Let me revise
                </button>
              </div>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-black text-base py-4 rounded-2xl transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#2d5c26,#1e3f18)', boxShadow: '0 8px 24px rgba(0,0,0,0.22)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('raise.submit.loading')}
              </span>
            ) : t('raise.submit.btn')}
          </button>

          {/* Crisis Resources — always visible, subtle but accessible */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.12)' }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#991B1B' }}>
              🆘 Need immediate help? Free, confidential support:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Childline */}
              <a
                href="tel:1098"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all"
                style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.06)'}
              >
                <span className="text-xl flex-shrink-0">📞</span>
                <div>
                  <p className="font-black text-sm" style={{ color: '#991B1B' }}>Childline 1098</p>
                  <p className="text-xs text-gray-500">24×7 · Free call · Children</p>
                </div>
              </a>
              {/* iCall */}
              <a
                href="tel:9152987821"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all"
                style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'}
              >
                <span className="text-xl flex-shrink-0">💙</span>
                <div>
                  <p className="font-black text-sm" style={{ color: '#3730A3' }}>iCall</p>
                  <p className="text-xs text-gray-500">91529 87821 · Counselling</p>
                </div>
              </a>
              {/* NCPCR e-Box */}
              <a
                href="https://ncpcr.gov.in/index1.php?lang=1&level=0&linkid=8&lid=113"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all"
                style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.06)'}
              >
                <span className="text-xl flex-shrink-0">🏛️</span>
                <div>
                  <p className="font-black text-sm" style={{ color: '#065F46' }}>NCPCR e-Box</p>
                  <p className="text-xs text-gray-500">National child rights</p>
                </div>
              </a>
            </div>
            <p className="text-xs text-gray-400 mt-2.5 text-center">
              These are independent national helplines — not connected to DPS Indore.
            </p>
          </div>
        </form>
      </main>

      {/* #4 Duplicate Detection Modal */}
      {duplicateWarning && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px', maxWidth: '480px', width: '100%',
            boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '28px' }}>⚠️</span>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#92400E', margin: 0 }}>
                    Possible Duplicate Complaint
                  </h3>
                  <p style={{ fontSize: '12px', color: '#B45309', margin: '3px 0 0' }}>
                    You already have open complaints in this category
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: '13px', color: '#374151', marginBottom: '14px' }}>
                You have <strong>{duplicateWarning.existing.length}</strong> open{' '}
                <strong>{domain}</strong> complaint{duplicateWarning.existing.length > 1 ? 's' : ''}{' '}
                from the last 7 days. Are you sure this is a different issue?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {duplicateWarning.existing.map(c => (
                  <div key={c.id} style={{
                    background: '#F9FAFB', border: '1px solid #E5E7EB',
                    borderRadius: '10px', padding: '10px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#003366', fontSize: '13px' }}>
                        {c.complaint_no}
                      </span>
                      <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '8px' }}>
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <button
                      onClick={() => { navigate(`/complaints/${c.id}`); setDuplicateWarning(null) }}
                      style={{
                        fontSize: '11px', color: '#003366', fontWeight: '600',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        textDecoration: 'underline', padding: 0,
                      }}
                    >
                      View →
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setDuplicateWarning(null)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px',
                    border: '1.5px solid #D1D5DB', background: 'transparent',
                    color: '#374151', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                  }}
                >
                  ← Go Back
                </button>
                <button
                  onClick={() => doSubmit(true)}
                  disabled={loading}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px',
                    background: 'linear-gradient(135deg,#92400E,#B45309)',
                    color: '#FEF3C7', fontWeight: '800', fontSize: '13px',
                    border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Submitting…' : '⚠️ Submit Anyway'}
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'center', marginTop: '10px' }}>
                Only submit if this is genuinely a different issue
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
