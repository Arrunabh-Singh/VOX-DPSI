import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'
import { sendVpcConsentEmail } from '../services/email.js'

const router = express.Router()

// ── Cookie config (#51) ──────────────────────────────────────────────────────
const IS_PROD = process.env.NODE_ENV === 'production'
const COOKIE_OPTS = {
  httpOnly: true,                  // JS cannot read — eliminates XSS token theft
  secure: IS_PROD,                 // HTTPS only in production
  sameSite: IS_PROD ? 'none' : 'lax', // 'none' needed for cross-site Railway→Vercel; 'lax' in dev
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matching JWT expiry
  path: '/',
}

function setAuthCookie(res, token) {
  res.cookie('vox_token', token, COOKIE_OPTS)
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, scholar_no, section, house } = req.body
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, role are required' })
    }

    const validRoles = ['student', 'council_member', 'class_teacher', 'coordinator', 'principal', 'supervisor', 'vice_principal', 'director', 'board_member']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    // ── Password complexity validation ────────────────────────────────────────
    const STAFF_ROLES = ['coordinator', 'principal', 'supervisor', 'vice_principal', 'director', 'board_member']
    if (STAFF_ROLES.includes(role)) {
      // Staff: 12+ chars, upper, lower, number, special char
      const staffPwRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;':",.<>?/`~]).{12,}$/
      if (!staffPwRe.test(password)) {
        return res.status(400).json({ error: 'Staff passwords must be at least 12 characters and include uppercase, lowercase, a number, and a special character.' })
      }
    } else {
      // Students & council members: 8+ chars, 1 letter, 1 number
      const studentPwRe = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/
      if (!studentPwRe.test(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters and include at least one letter and one number.' })
      }
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const password_hash = await bcrypt.hash(password, 12)

    const { data: user, error } = await supabase
      .from('users')
      .insert({ name, email, password_hash, role, scholar_no, section, house })
      .select('id, name, email, role, scholar_no, section, house, created_at')
      .single()

    if (error) throw error

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, scholar_no: user.scholar_no, section: user.section, house: user.house },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    setAuthCookie(res, token)
    res.status(201).json({ token, user }) // token also in body for dev tooling
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !user) return res.status(401).json({ error: 'Invalid credentials' })

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, scholar_no: user.scholar_no, section: user.section, house: user.house },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Return all fields except password hash — privacy_acknowledged included so
    // the frontend gate can block the dashboard immediately if needed
    const { password_hash, ...safeUser } = user
    setAuthCookie(res, token)
    res.json({ token, user: safeUser }) // token also in body for dev tooling
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, scholar_no, section, house, is_privacy_acknowledged, privacy_acknowledged_at, created_at')
      .eq('id', req.user.id)
      .single()

    if (error || !user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// POST /api/auth/logout — clear HttpOnly cookie (#51)
router.post('/logout', (req, res) => {
  res.clearCookie('vox_token', { ...COOKIE_OPTS, maxAge: 0 })
  res.json({ ok: true })
})

// ── Verifiable Parental Consent (VPC) — DPDP Act 2023 Section 9 (#59) ─────────

// POST /api/auth/vpc-request — student submits parent email; server sends consent link
router.post('/vpc-request', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can request parental consent' })
    }

    const { parent_email } = req.body
    if (!parent_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parent_email)) {
      return res.status(400).json({ error: 'A valid parent/guardian email is required' })
    }

    // Fetch student name
    const { data: student } = await supabase
      .from('users')
      .select('name, vpc_status')
      .eq('id', req.user.id)
      .single()

    if (!student) return res.status(404).json({ error: 'User not found' })

    // If already granted, nothing to do
    if (student.vpc_status === 'granted') {
      return res.json({ ok: true, status: 'already_granted' })
    }

    // Generate a secure token valid for 72 hours
    const token = randomUUID()
    const expires = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

    await supabase
      .from('users')
      .update({
        vpc_status: 'pending',
        vpc_parent_email: parent_email,
        vpc_token: token,
        vpc_token_expires_at: expires,
      })
      .eq('id', req.user.id)

    // Send email (non-blocking — log on failure, don't crash)
    try {
      const { grantUrl } = await sendVpcConsentEmail(parent_email, student.name, token)
      console.log(`[VPC] Consent email sent to ${parent_email} for ${student.name}`)
      res.json({ ok: true, status: 'email_sent', expires_at: expires,
        // Expose grant URL in dev so it can be clicked without email
        ...(process.env.NODE_ENV !== 'production' ? { dev_grant_url: grantUrl } : {})
      })
    } catch (emailErr) {
      console.error('[VPC] Email send failed:', emailErr.message)
      // Still return ok — token was saved; parent can use the URL if shared manually
      res.json({ ok: true, status: 'email_queued', warning: 'Email delivery pending. Please check spam or contact school.' })
    }
  } catch (err) {
    console.error('VPC request error:', err)
    res.status(500).json({ error: 'Failed to send consent request' })
  }
})

// GET /api/auth/vpc-verify — parent clicks link; server records consent/decline
// Query params: ?token=<uuid>&action=grant|decline
router.get('/vpc-verify', async (req, res) => {
  const { token, action } = req.query

  if (!token || !['grant', 'decline'].includes(action)) {
    return res.status(400).send(vpcPage('Invalid Link', 'This consent link is malformed or incomplete.', false))
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, vpc_status, vpc_token_expires_at')
      .eq('vpc_token', token)
      .single()

    if (error || !user) {
      return res.status(404).send(vpcPage('Link Not Found', 'This consent link could not be found. It may have already been used.', false))
    }

    if (user.vpc_status === 'granted') {
      return res.send(vpcPage('Already Consented', `Consent for ${user.name} has already been recorded. Thank you.`, true))
    }

    if (new Date(user.vpc_token_expires_at) < new Date()) {
      await supabase.from('users').update({ vpc_status: 'expired' }).eq('id', user.id)
      return res.send(vpcPage('Link Expired', 'This consent link has expired (72-hour window). Please ask your child to request a new link from the app.', false))
    }

    const newStatus = action === 'grant' ? 'granted' : 'declined'
    await supabase
      .from('users')
      .update({
        vpc_status: newStatus,
        vpc_token: null,          // invalidate token after use
        vpc_token_expires_at: null,
        vpc_granted_at: action === 'grant' ? new Date().toISOString() : null,
      })
      .eq('id', user.id)

    if (action === 'grant') {
      return res.send(vpcPage(
        '✅ Consent Granted',
        `Thank you! You have given consent for ${user.name} to use Vox DPSI. They can now access the platform.`,
        true
      ))
    } else {
      return res.send(vpcPage(
        'Consent Declined',
        `You have declined consent for ${user.name}. Their account access will remain restricted. If you change your mind, please contact the school.`,
        false
      ))
    }
  } catch (err) {
    console.error('VPC verify error:', err)
    res.status(500).send(vpcPage('Error', 'An error occurred. Please try again or contact the school.', false))
  }
})

// GET /api/auth/vpc-status — lets the client poll for consent status
router.get('/vpc-status', verifyToken, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('vpc_status, vpc_parent_email, vpc_granted_at')
      .eq('id', req.user.id)
      .single()
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({
      vpc_status: user.vpc_status,
      vpc_parent_email: user.vpc_parent_email ? user.vpc_parent_email.replace(/(.{2}).+(@.+)/, '$1***$2') : null,
      vpc_granted_at: user.vpc_granted_at,
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch VPC status' })
  }
})

// ── Data Erasure Request (#60) — DPDP Act 2023 Section 13 ────────────────────
// Any user (student or their parent/guardian) can submit a formal erasure request.
// This creates an audit record and notifies coordinators. Actual PII deletion
// requires a manual approval by the principal (regulatory safeguard — school
// may be required to retain records for litigation or statutory purposes).

// POST /api/auth/erasure-request — logged-in user submits PII deletion request
router.post('/erasure-request', verifyToken, async (req, res) => {
  try {
    const { reason } = req.body
    const userId = req.user.id

    if (!reason || reason.trim().length < 20) {
      return res.status(400).json({ error: 'Please provide a reason (at least 20 characters).' })
    }

    // Check for an existing pending request to prevent spam
    const { data: existingReq } = await supabase
      .from('erasure_requests')
      .select('id, status')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single()

    if (existingReq) {
      return res.status(409).json({
        error: 'You already have a pending erasure request. The school coordinator will review it shortly.',
        existing_request_id: existingReq.id,
      })
    }

    // Log the request
    const { data: erReq, error: erErr } = await supabase
      .from('erasure_requests')
      .insert({
        user_id: userId,
        role: req.user.role,
        reason: reason.trim(),
        status: 'pending',
      })
      .select('id, created_at')
      .single()

    if (erErr) throw erErr

    // Notify all coordinators (in-app)
    const { data: coordinators } = await supabase
      .from('users').select('id').eq('role', 'coordinator')
    if (coordinators) {
      const { createNotification } = await import('../services/notifications.js')
      for (const coord of coordinators) {
        createNotification(
          coord.id,
          '🗑️ Data Erasure Request',
          `User (role: ${req.user.role}) has submitted a personal data erasure request under DPDP Act 2023. Review in Admin → Erasure Requests.`,
          'erasure_request',
          null
        ).catch(() => {})
      }
    }

    console.log(`[Erasure] Request logged for user ${userId} at ${erReq.created_at}`)
    res.json({
      ok: true,
      request_id: erReq.id,
      message: 'Your erasure request has been logged and forwarded to the school coordinator. You will be contacted within 30 days as required by the DPDP Act 2023.',
    })
  } catch (err) {
    console.error('Erasure request error:', err)
    res.status(500).json({ error: 'Failed to submit erasure request' })
  }
})

// GET /api/auth/erasure-request — check if current user has a pending erasure request
router.get('/erasure-request', verifyToken, async (req, res) => {
  try {
    const { data: requests } = await supabase
      .from('erasure_requests')
      .select('id, status, reason, created_at, reviewed_at, reviewer_note')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    res.json({ requests: requests || [] })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch erasure requests' })
  }
})

// Simple server-rendered HTML page shown to parents after clicking consent link
function vpcPage(title, message, success) {
  const color = success ? '#16A34A' : '#DC2626'
  const icon  = success ? '✅' : '⚠️'
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Vox DPSI</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  body{font-family:Inter,Arial,sans-serif;background:#f5f7fa;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border-radius:16px;padding:48px 40px;max-width:480px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.1)}
  .logo{color:#003366;font-size:20px;font-weight:900;letter-spacing:1px;margin-bottom:4px}
  .school{color:#9CA3AF;font-size:12px;margin-bottom:32px}
  .icon{font-size:52px;margin-bottom:16px}
  h1{color:${color};font-size:22px;font-weight:900;margin:0 0 12px}
  p{color:#4B5563;font-size:15px;line-height:1.6;margin:0 0 24px}
  .footer{color:#9CA3AF;font-size:11px;margin-top:16px}
</style>
</head>
<body>
<div class="card">
  <div class="logo">VOX DPSI</div>
  <div class="school">Delhi Public School Indore</div>
  <div class="icon">${icon}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <p class="footer">If you have questions, contact us at <a href="mailto:principal@dpsi.edu.in" style="color:#003366">principal@dpsi.edu.in</a></p>
</div>
</body></html>`
}

export default router
