import { useState, useEffect, useRef } from 'react'
import api from '../utils/api'
import { DOMAINS, STATUSES } from '../utils/constants'
import toast from 'react-hot-toast'

/**
 * MergeModal — merge a duplicate complaint into a primary one.
 *
 * Props:
 *   sourceComplaint — the complaint being merged away (already loaded)
 *   onClose()      — called on cancel / close
 *   onSuccess(targetId) — called after successful merge
 */
export default function MergeModal({ sourceComplaint, onClose, onSuccess }) {
  const [search, setSearch]         = useState('')
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(null)   // target complaint
  const [reason, setReason]         = useState('')
  const [merging, setMerging]       = useState(false)
  const [step, setStep]             = useState('search') // 'search' | 'confirm'
  const searchRef = useRef(null)

  // Load candidates when modal opens
  useEffect(() => {
    fetchCandidates()
    setTimeout(() => searchRef.current?.focus(), 80)
  }, [])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => fetchCandidates(search), 300)
    return () => clearTimeout(t)
  }, [search])

  async function fetchCandidates(q = '') {
    setLoading(true)
    try {
      const { data } = await api.get(
        `/api/complaints/${sourceComplaint.id}/merge-candidates${q ? `?q=${encodeURIComponent(q)}` : ''}`
      )
      setCandidates(data || [])
    } catch {
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }

  async function handleMerge() {
    if (!selected) return
    setMerging(true)
    try {
      await api.post(`/api/complaints/${sourceComplaint.id}/merge`, {
        target_id: selected.id,
        reason: reason.trim() || undefined,
      })
      toast.success(`${sourceComplaint.complaint_no} merged into ${selected.complaint_no}`)
      onSuccess(selected.id)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Merge failed')
      setMerging(false)
    }
  }

  const srcDomain = DOMAINS[sourceComplaint.domain]
  const srcStatus = STATUSES[sourceComplaint.status]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#fff', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(45,92,38,0.12)' }}>
          <div>
            <h2 className="font-black text-lg" style={{ color: '#2d5c26' }}>Merge Complaint</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Merge <strong>{sourceComplaint.complaint_no}</strong> into another complaint. The source complaint will be closed and its history copied to the target.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {step === 'search' ? (
          <>
            {/* Source complaint summary */}
            <div className="px-6 pt-4 pb-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Merging away (source)</p>
              <div className="rounded-xl p-3 flex gap-3 items-start"
                style={{ background: 'rgba(220,38,38,0.05)', border: '1.5px solid rgba(220,38,38,0.15)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-black text-sm" style={{ color: '#DC2626' }}>{sourceComplaint.complaint_no}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: srcDomain?.color + '22', color: srcDomain?.color }}>
                      {srcDomain?.icon} {srcDomain?.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: srcStatus?.color + '22', color: srcStatus?.color }}>
                      {srcStatus?.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{sourceComplaint.description}</p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="px-6 pb-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Select target complaint (merge into)</p>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by VOX number or keyword…"
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ border: '1.5px solid rgba(45,92,38,0.2)', background: '#fafafa' }}
              />
            </div>

            {/* Candidate list */}
            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-2" style={{ minHeight: '160px', maxHeight: '340px' }}>
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2d5c26', borderTopColor: 'transparent' }} />
                </div>
              ) : candidates.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-4xl mb-2">🔍</p>
                  <p className="text-sm text-gray-500 font-medium">No open complaints in the same domain found</p>
                  <p className="text-xs text-gray-400 mt-1">Merging is only available within the same domain</p>
                </div>
              ) : (
                candidates.map(c => {
                  const dom = DOMAINS[c.domain]
                  const st  = STATUSES[c.status]
                  const isSelected = selected?.id === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelected(isSelected ? null : c)}
                      className="w-full text-left rounded-xl p-3 transition-all"
                      style={{
                        background: isSelected ? 'rgba(45,92,38,0.07)' : 'rgba(0,0,0,0.02)',
                        border: `1.5px solid ${isSelected ? '#2d5c26' : 'rgba(0,0,0,0.07)'}`,
                      }}
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`font-black text-sm ${isSelected ? '' : 'text-gray-700'}`} style={isSelected ? { color: '#2d5c26' } : {}}>
                          {isSelected ? '✓ ' : ''}{c.complaint_no}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: dom?.color + '22', color: dom?.color }}>
                          {dom?.icon} {dom?.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: st?.color + '22', color: st?.color }}>
                          {st?.label}
                        </span>
                        {c.student_section && (
                          <span className="text-xs text-gray-400">{c.student_section}</span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">
                          {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{c.description}</p>
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex items-center justify-between gap-3" style={{ borderColor: 'rgba(45,92,38,0.12)' }}>
              <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all">
                Cancel
              </button>
              <button
                disabled={!selected}
                onClick={() => setStep('confirm')}
                className="px-6 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: selected ? '#2d5c26' : '#e5e7eb', color: selected ? '#c9a84c' : '#9ca3af' }}
              >
                Next: Review Merge →
              </button>
            </div>
          </>
        ) : (
          /* Confirm step */
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="rounded-xl p-4" style={{ background: 'rgba(220,38,38,0.04)', border: '1.5px solid rgba(220,38,38,0.15)' }}>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#DC2626' }}>⚠ Merging away (will be closed)</p>
                <p className="font-black text-base" style={{ color: '#DC2626' }}>{sourceComplaint.complaint_no}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{sourceComplaint.description?.slice(0, 160)}</p>
              </div>

              <div className="flex items-center justify-center">
                <div className="h-px flex-1" style={{ background: 'rgba(45,92,38,0.15)' }} />
                <span className="px-3 text-xl">⬇️</span>
                <div className="h-px flex-1" style={{ background: 'rgba(45,92,38,0.15)' }} />
              </div>

              <div className="rounded-xl p-4" style={{ background: 'rgba(45,92,38,0.05)', border: '1.5px solid rgba(45,92,38,0.2)' }}>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#2d5c26' }}>✓ Merging into (primary — stays open)</p>
                <p className="font-black text-base" style={{ color: '#2d5c26' }}>{selected.complaint_no}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{selected.description?.slice(0, 160)}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Reason for merge <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Duplicate complaint about same infrastructure issue in XII B corridor"
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none"
                  style={{ border: '1.5px solid rgba(45,92,38,0.2)', background: '#fafafa' }}
                />
              </div>

              <div className="rounded-xl p-3 text-xs text-gray-500" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.07)' }}>
                <p className="font-semibold text-gray-700 mb-1">What will happen:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li><strong>{sourceComplaint.complaint_no}</strong> will be marked as <em>Merged</em> and closed</li>
                  <li>Its entire timeline history will be copied into <strong>{selected.complaint_no}</strong></li>
                  <li>Future updates will only apply to <strong>{selected.complaint_no}</strong></li>
                  <li>This action <strong>cannot be undone</strong></li>
                </ul>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex items-center justify-between gap-3" style={{ borderColor: 'rgba(45,92,38,0.12)' }}>
              <button onClick={() => setStep('search')} className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all">
                ← Back
              </button>
              <button
                disabled={merging}
                onClick={handleMerge}
                className="px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-60"
                style={{ background: '#DC2626', color: '#fff' }}
              >
                {merging ? (
                  <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Merging…</>
                ) : '🔀 Confirm Merge'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
