import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const QUORUM = 2

// ── ConsensusVotingPanel ──────────────────────────────────────────────────────
// Shown on CouncilDashboard → "Consensus Votes" tab.
// Lists all complaints awaiting peer approval before they can be resolved.
export function ConsensusVotingPanel({ currentUserId, onVoteCast }) {
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [voting,     setVoting]     = useState(null)   // complaint id being voted on
  const [vote,       setVote]       = useState('')
  const [note,       setNote]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/api/complaints/consensus-pending')
      .then(r => setItems(r.data))
      .catch(() => toast.error('Failed to load consensus queue'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const submitVote = async (complaintId) => {
    if (!vote) return toast.error('Select Approve or Reject')
    setSubmitting(true)
    try {
      const { data } = await api.post(`/api/complaints/${complaintId}/consensus-vote`, { vote, note })
      if (data.resolved) {
        toast.success('✅ Quorum reached — complaint resolved!')
      } else if (data.rejected) {
        toast.error('❌ Consensus rejected — resolution reverted')
      } else {
        toast.success(`Vote recorded. ${data.approve_count}/${QUORUM} needed.`)
      }
      setVoting(null); setVote(''); setNote('')
      load()
      if (onVoteCast) onVoteCast()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Vote failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="glass rounded-2xl p-8 text-center text-gray-400 text-sm">
      Loading consensus queue…
    </div>
  )

  if (items.length === 0) return (
    <div className="glass rounded-2xl p-12 text-center">
      <p className="text-4xl mb-3">🗳️</p>
      <h3 className="font-bold text-gray-700 text-lg">No Pending Votes</h3>
      <p className="text-gray-500 text-sm mt-1">
        When a council member requests peer approval for a sensitive complaint, it will appear here.
      </p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl px-5 py-4">
        <h3 className="font-black text-base" style={{ color: '#2d5c26' }}>🗳️ Consensus Queue</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Sensitive complaints (behaviour/personal) need {QUORUM} peer approvals before resolving.
        </p>
      </div>

      {items.map(item => {
        const alreadyVoted = !!item.my_vote
        const isRequester  = item.requested_by?.id === currentUserId
        const domainColor  = item.domain === 'behaviour' ? '#EAB308' : '#8B5CF6'
        const pct          = Math.round((item.approve_count / QUORUM) * 100)

        return (
          <div key={item.id} className="glass rounded-2xl p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm" style={{ color: '#2d5c26' }}>
                    {item.complaint_no_display}
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full capitalize"
                    style={{ background: domainColor + '18', color: domainColor }}
                  >
                    {item.domain}
                  </span>
                  {isRequester && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(45,92,38,0.1)', color: '#2d5c26' }}>
                      Your request
                    </span>
                  )}
                </div>
                {item.requested_by && !isRequester && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Submitted by {item.requested_by.name}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">
                  {item.approve_count}/{QUORUM} approvals
                </p>
                {item.reject_count > 0 && (
                  <p className="text-xs text-red-400">{item.reject_count} rejected</p>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full mb-3" style={{ background: 'rgba(45,92,38,0.1)' }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${Math.min(pct, 100)}%`, background: '#16A34A' }}
              />
            </div>

            {/* Proposed resolution note */}
            {item.consensus_resolution_note && (
              <div className="rounded-xl p-3 mb-3 text-sm text-gray-700"
                style={{ background: 'rgba(45,92,38,0.05)', border: '1px solid rgba(45,92,38,0.1)' }}>
                <p className="text-xs font-bold text-gray-500 mb-1">PROPOSED RESOLUTION</p>
                <p className="leading-relaxed">{item.consensus_resolution_note}</p>
              </div>
            )}

            {/* Existing votes */}
            {item.votes.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {item.votes.map(v => (
                  <span
                    key={v.voter_id}
                    className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={
                      v.vote === 'approve'
                        ? { background: '#DCFCE7', color: '#16A34A' }
                        : { background: '#FEE2E2', color: '#DC2626' }
                    }
                  >
                    {v.voter?.name} · {v.vote === 'approve' ? '✅' : '❌'}
                  </span>
                ))}
              </div>
            )}

            {/* Vote UI */}
            {!isRequester && !alreadyVoted && (
              voting === item.id ? (
                <div className="space-y-2 mt-2">
                  <div className="flex gap-2">
                    {[
                      { val: 'approve', lbl: '✅ Approve', bg: '#DCFCE7', color: '#16A34A' },
                      { val: 'reject',  lbl: '❌ Reject',  bg: '#FEE2E2', color: '#DC2626' },
                    ].map(({ val, lbl, bg, color }) => (
                      <button
                        key={val}
                        onClick={() => setVote(val)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                        style={vote === val
                          ? { background: bg, borderColor: color, color }
                          : { borderColor: '#E5E7EB', color: '#6B7280', background: '#fff' }
                        }
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={2}
                    placeholder="Add a note (optional)…"
                    className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none"
                    style={{ border: '1.5px solid rgba(45,92,38,0.2)', background: 'rgba(255,255,255,0.9)' }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setVoting(null); setVote(''); setNote('') }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => submitVote(item.id)}
                      disabled={submitting || !vote}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                      style={{ background: vote === 'approve' ? '#16A34A' : vote === 'reject' ? '#DC2626' : '#6B7280' }}
                    >
                      {submitting ? 'Submitting…' : 'Submit Vote'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setVoting(item.id)}
                  className="mt-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: '#7C3AED' }}
                >
                  🗳️ Cast My Vote
                </button>
              )
            )}

            {alreadyVoted && (
              <div className="mt-1 text-xs font-semibold"
                style={{ color: item.my_vote === 'approve' ? '#16A34A' : '#DC2626' }}>
                You voted: {item.my_vote === 'approve' ? '✅ Approve' : '❌ Reject'}
              </div>
            )}

            {isRequester && (
              <p className="mt-1 text-xs text-gray-400 italic">
                Waiting for {QUORUM - item.approve_count} more approval{QUORUM - item.approve_count !== 1 ? 's' : ''}…
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── RequestConsensusButton ─────────────────────────────────────────────────────
// Rendered in ComplaintDetail in place of the "Resolve" button for sensitive domains
// when the complaint is assigned to the current council member.
export function RequestConsensusButton({ complaintId, existingNote, consensusStatus, onRequested }) {
  const [open,       setOpen]       = useState(false)
  const [resNote,    setResNote]    = useState(existingNote || '')
  const [submitting, setSubmitting] = useState(false)

  if (consensusStatus === 'voting') {
    return (
      <div className="rounded-xl px-4 py-3 text-sm font-semibold"
        style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1D4ED8' }}>
        🗳️ Resolution submitted for peer consensus — waiting for {QUORUM} votes
      </div>
    )
  }

  if (consensusStatus === 'approved') {
    return (
      <div className="rounded-xl px-4 py-3 text-sm font-semibold"
        style={{ background: '#DCFCE7', border: '1.5px solid #86EFAC', color: '#16A34A' }}>
        ✅ Peer consensus approved — complaint resolved
      </div>
    )
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      await api.post(`/api/complaints/${complaintId}/request-consensus`, {
        resolution_note: resNote,
      })
      toast.success('Resolution submitted for peer review')
      setOpen(false)
      if (onRequested) onRequested()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to request consensus')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
        style={{ background: '#7C3AED', color: '#fff' }}
        onMouseEnter={e => e.currentTarget.style.background = '#6D28D9'}
        onMouseLeave={e => e.currentTarget.style.background = '#7C3AED'}
      >
        🗳️ Request Peer Consensus
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="rounded-2xl p-6 w-full max-w-md shadow-2xl" style={{ background: '#fff' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-base" style={{ color: '#7C3AED' }}>🗳️ Request Peer Consensus</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This complaint requires peer approval before it can be resolved.
              Write your proposed resolution note — {QUORUM} council members will vote on it.
            </p>
            <textarea
              value={resNote}
              onChange={e => setResNote(e.target.value)}
              rows={4}
              placeholder="Describe how this complaint was addressed and what actions were taken…"
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none mb-4"
              style={{ border: '1.5px solid rgba(124,58,237,0.25)', background: 'rgba(255,255,255,0.9)' }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting || !resNote.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: '#7C3AED' }}
              >
                {submitting ? 'Submitting…' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
