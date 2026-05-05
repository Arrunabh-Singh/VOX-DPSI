/**
 * useSessionTimeout — auto-logout after TIMEOUT_MS of inactivity (#31)
 *
 * Resets on any user interaction (mousemove, keydown, click, touchstart, scroll).
 * Shows a 60-second warning modal before logging out so the user can extend.
 * Students also get a notification-bell dismissal opportunity.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const TIMEOUT_MS    = 30 * 60 * 1000   // 30 minutes inactivity → logout
const WARNING_MS    = 60 * 1000         // show warning 60 s before logout
const WARN_AT_MS    = TIMEOUT_MS - WARNING_MS

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']

export function useSessionTimeout() {
  const { user, logout } = useAuth()
  const navigate          = useNavigate()
  const timeoutRef        = useRef(null)
  const warnRef           = useRef(null)
  const [showWarning, setShowWarning]   = useState(false)
  const [secondsLeft, setSecondsLeft]  = useState(60)
  const countdownRef      = useRef(null)

  const clearAllTimers = useCallback(() => {
    clearTimeout(timeoutRef.current)
    clearTimeout(warnRef.current)
    clearInterval(countdownRef.current)
  }, [])

  const doLogout = useCallback(() => {
    clearAllTimers()
    setShowWarning(false)
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate, clearAllTimers])

  const extend = useCallback(() => {
    clearAllTimers()
    setShowWarning(false)
    setSecondsLeft(60)
    // re-arm
    if (user) {
      warnRef.current    = setTimeout(() => {
        setShowWarning(true)
        setSecondsLeft(60)
        countdownRef.current = setInterval(() => {
          setSecondsLeft(prev => {
            if (prev <= 1) {
              clearInterval(countdownRef.current)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }, WARN_AT_MS)
      timeoutRef.current = setTimeout(doLogout, TIMEOUT_MS)
    }
  }, [user, doLogout, clearAllTimers])

  useEffect(() => {
    if (!user) { clearAllTimers(); return }

    // arm timers
    extend()

    // reset on activity
    const onActivity = () => {
      if (!showWarning) extend()
    }
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }))

    return () => {
      clearAllTimers()
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, onActivity))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return { showWarning, secondsLeft, extend, doLogout }
}
