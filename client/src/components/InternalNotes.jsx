import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { ROLES } from '../utils/constants'

const ROLE_COLORS = {
  council_member: { bg: '#EFF6FF', color: '#1D4ED8' },
  class_teacher:  { bg: '#FFF7ED', color: '#C2410C' },
  coordinator:    { bg: '#FEFCE8', color: '#A16207' },
  principal:      { bg: '#FEF2F2', color: '#B91C1C' },
  supervisor:     { bg: '#F5F3FF', color: '#6D28D9' },
}

export default function InternalNotes({ complaintId }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchNotes = async () => {
    try {
      const res = await api.get(`/api/complaints/${complaintId}/notes`)
      setNotes(res.data || [])
    } catch {
      // silently fail if table doesn't exist yet
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNotes() }, [complaintId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (newNote.trim().length < 3) return toast.error('Note is too short')
    setSubmitting(true)
    try {
      const res = await api.post(`/api/complaints/${complaintId}/notes`, { note: newNote.trim() })
      setNotes(prev => [...prev, res.data])
      setNewNote('')
      toast.success('Note added')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add note')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (ts) =>
    new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="glass rounded-2xl p-5 mt-4" style={{ border: '1px solid rgba(45,92,38,0.1)' }}>
      <div className="flex items-center gap-2 mb-4">
        <span style={{ fontSize: '18px' }}>📝</span>
        <h3 className="font-black text-sm uppercase tracking-wide" style={{ color: '#2d5c26' }}>Internal Notes</h3>
        <span className="text-xs text-gray-400 font-medium">(Staff only — not visible to student)</span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading notes...</p>
      ) : (
        <>
          {notes.length === 0 && (
            <p className="text-sm text-gray-400 mb-4">No internal notes yet. Add one below.</p>
          )}
          <div className="space-y-3 mb-4">
            {notes.map(n => {
              const style = ROLE_COLORS[n.author?.role] || { bg: '#F9FAFB', color: '#374151' }
              return (
                <div key={n.id} className="rounded-xl px-4 py-3" style={{ background: style.bg, border: `1px solid ${style.color}22` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold" style={{ color: style.color }}>
                      {n.author?.name || 'Staff'} · {ROLES[n.author?.role] || n.author?.role}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">{formatDate(n.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{n.note}</p>
                </div>
              )
            })}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add an internal note..."
              className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              style={{ border: '1.5px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.9)' }}
              onFocus={e => e.target.style.borderColor = '#2d5c26'}
              onBlur={e => e.target.style.borderColor = 'rgba(45,92,38,0.15)'}
            />
            <button type="submit" disabled={submitting || newNote.trim().length < 3}
              className="px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: '#2d5c26', color: '#c9a84c', border: 'none' }}>
              {submitting ? '...' : 'Add'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
