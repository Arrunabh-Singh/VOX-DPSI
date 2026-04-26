import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

// ── In-memory cache shared across all hook instances ──────────────────────────
const cache = { data: null, ts: 0 }
const STALE_MS = 30_000 // 30 seconds — serve cached data instantly, background refresh

export function useComplaints() {
  const [complaints, setComplaints] = useState(() => cache.data || [])
  const [loading, setLoading]       = useState(!cache.data) // instant if cached
  const [error, setError]           = useState(null)
  const mounted = useRef(true)

  const fetchComplaints = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get('/api/complaints')
      if (!mounted.current) return
      cache.data = res.data
      cache.ts   = Date.now()
      setComplaints(res.data)
      setError(null)
    } catch (err) {
      if (!mounted.current) return
      setError(err.response?.data?.error || 'Failed to load complaints')
      if (!silent) toast.error('Failed to load complaints')
    } finally {
      if (mounted.current && !silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    const isStale = Date.now() - cache.ts > STALE_MS
    if (cache.data && !isStale) {
      // Serve cache immediately, refresh silently in background
      setComplaints(cache.data)
      setLoading(false)
      fetchComplaints({ silent: true })
    } else {
      fetchComplaints()
    }
    return () => { mounted.current = false }
  }, [fetchComplaints])

  return { complaints, loading, error, refetch: fetchComplaints }
}

export function useComplaint(id) {
  const [complaint, setComplaint] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [cRes, tRes] = await Promise.all([
        api.get(`/api/complaints/${id}`),
        api.get(`/api/complaints/${id}/timeline`),
      ])
      setComplaint(cRes.data)
      setTimeline(tRes.data)
    } catch (err) {
      toast.error('Failed to load complaint details')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { complaint, timeline, loading, refetch: fetchAll }
}
