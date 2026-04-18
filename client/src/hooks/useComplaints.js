import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

export function useComplaints() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchComplaints = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/complaints')
      setComplaints(res.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load complaints')
      toast.error('Failed to load complaints')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchComplaints() }, [fetchComplaints])

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
