import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

const TYPE_CONFIG = {
  status_update: { icon: '🔄', color: '#4F46E5', bg: '#EEF2FF', label: 'Status Update' },
  escalation:    { icon: '⬆️', color: '#EA580C', bg: '#FFF7ED', label: 'Escalated' },
  appeal:        { icon: '⚖️', color: '#7C3AED', bg: '#F5F3FF', label: 'Appeal Filed' },
  note:          { icon: '📝', color: '#0891B2', bg: '#ECFEFF', label: 'Note Added' },
  assignment:    { icon: '📌', color: '#2d5c26', bg: '#F0FDF4', label: 'Assigned' },
  resolution:    { icon: '🎉', color: '#16A34A', bg: '#DCFCE7', label: 'Resolved' },
  auto_escalation: { icon: '⚡', color: '#DC2626', bg: '#FEF2F2', label: 'Auto-Escalated' },
}

const DEFAULT_TYPE = { icon: '🔔', color: '#6B7280', bg: '#F3F4F6', label: 'Notification' }

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const prevCount = useRef(0)
  const ref = useRef(null)
  const navigate = useNavigate()

  const unread = notifications.filter(n => !n.is_read).length

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications')
      const incoming = res.data || []
      const newUnread = incoming.filter(n => !n.is_read).length
      if (newUnread > prevCount.current && prevCount.current !== 0) {
        setJustAdded(true)
        setTimeout(() => setJustAdded(false), 800)
      }
      prevCount.current = newUnread
      setNotifications(incoming)
    } catch { /* silently fail */ }
  }

  useEffect(() => {
    // Delay initial fetch 2.5s — don't compete with complaints/auth on cold start
    const initial = setTimeout(fetchNotifications, 2500)
    // Poll every 60s — notifications don't need to be instant
    const interval = setInterval(fetchNotifications, 60000)
    return () => { clearTimeout(initial); clearInterval(interval) }
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const markAllRead = async (e) => {
    e.stopPropagation()
    try {
      await api.patch('/api/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch {}
  }

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      await api.patch(`/api/notifications/${notif.id}/read`).catch(() => {})
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
    }
    setOpen(false)
    if (notif.complaint_id) navigate(`/complaints/${notif.complaint_id}`)
  }

  const timeAgo = (ts) => {
    const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const cfg = (type) => TYPE_CONFIG[type] || DEFAULT_TYPE

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications() }}
        style={{
          position: 'relative',
          background: open ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.20)',
          borderRadius: '12px',
          padding: '7px 10px',
          cursor: 'pointer',
          color: 'white',
          fontSize: '18px',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          transition: 'background 0.15s',
          animation: justAdded ? 'notif-pulse 0.4s ease-in-out 2' : 'none',
        }}
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '3px', right: '3px',
            background: '#DC2626',
            color: '#fff',
            borderRadius: '50%',
            minWidth: '17px', height: '17px',
            fontSize: '9px', fontWeight: '800',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #2d5c26',
            padding: '0 3px',
            animation: 'none',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="animate-slide-down"
          style={{
            position: 'fixed', top: '60px', right: '8px', left: '8px',
            maxWidth: '380px', marginLeft: 'auto',
            maxHeight: '480px',
            background: '#fff',
            borderRadius: '18px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            border: '1px solid rgba(45,92,38,0.12)',
            overflow: 'hidden',
            zIndex: 1000,
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #2d5c26 0%, #1e3f18 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🔔</span>
              <span style={{ fontWeight: '700', fontSize: '14px', color: '#fff' }}>
                Notifications
              </span>
              {unread > 0 && (
                <span style={{
                  background: '#DC2626', color: '#fff', borderRadius: '20px',
                  fontSize: '11px', fontWeight: '700', padding: '1px 8px',
                }}>
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  letterSpacing: '0.03em',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: '36px', marginBottom: '10px' }}>🔔</p>
                <p style={{ color: '#374151', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>All caught up!</p>
                <p style={{ color: '#9CA3AF', fontSize: '12px' }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n, i) => {
                const c = cfg(n.type)
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      background: n.is_read ? '#fff' : `rgba(45,92,38,0.04)`,
                      borderBottom: i < notifications.length - 1 ? '1px solid #f5f5f5' : 'none',
                      transition: 'background 0.12s',
                      borderLeft: !n.is_read ? `3px solid ${c.color}` : '3px solid transparent',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
                    onMouseLeave={e => e.currentTarget.style.background = n.is_read ? '#fff' : 'rgba(45,92,38,0.04)'}
                  >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      {/* Icon circle */}
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: c.bg, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '16px', flexShrink: 0,
                      }}>
                        {c.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <p style={{
                            fontWeight: n.is_read ? '600' : '700',
                            fontSize: '13px', color: '#1A1A1A', margin: 0,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span style={{
                              width: '7px', height: '7px', borderRadius: '50%',
                              background: c.color, flexShrink: 0, marginLeft: '6px',
                            }} />
                          )}
                        </div>
                        <p style={{ fontSize: '12px', color: '#6B7280', margin: 0, lineHeight: '1.4' }}>{n.body}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <span style={{
                            fontSize: '10px', fontWeight: '600', color: c.color,
                            background: c.bg, padding: '1px 6px', borderRadius: '6px',
                          }}>
                            {c.label}
                          </span>
                          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{timeAgo(n.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid #f0f0f0',
              textAlign: 'center',
              background: '#fafafa',
            }}>
              <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                Showing last {notifications.length} notifications
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
