import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID, randomInt } from 'crypto'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'
import { sendVpcConsentEmail, sendLoginOtpEmail } from '../services/email.js'
import { sendSmsOtp, verifySmsOtp } from '../services/msg91.js'

// ── In-memory OTP store (login OTPs — short-lived, ephemeral) ────────────────
// Key: sessionId (uuid)
// Value: { userId, userObj, otpHash, expiresAt, attempts, resendCount }
//   attempts   — wrong OTP guesses so far (max 5 before session is killed)
//   resendCount — how many times OTP has been regenerated (max 3)
const loginOtpStore = new Map()

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of loginOtpStore.entries()) {
    if (val.expiresAt < now) loginOtpStore.delete(key)
  }
}, 5 * 60 * 1000)

// Use crypto.randomInt — cryptographically secure, unlike Math.random()
function genOtp() {
  return randomInt(100000, 1000000).toString()
}

// Phone OTP store (in-memory, 10 min TTL)
// Key: sessionId, Value: { userId, phone, otp, expiresAt }
const phoneOtpStore = new Map()
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of phoneOtpStore.entries()) {
    if (val.expiresAt < now) phoneOtpStore.delete(key)
  }
}, 5 * 60 * 1000)

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

    const validRoles = ['student', 'guardian', 'council_member', 'class_teacher', 'coordinator', 'principal', 'supervisor', 'vice_principal', 'director', 'board_member']
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
      { id: user.id, name: user.name, email: user.email, role: user.role, scholar_no: user.scholar_no, section: user.section, house: user.house },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    setAuthCookie(res, token)
    res.status(201).json({ user })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/auth/login — Step 1: verify credentials → send OTP
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

    // ── SKIP_OTP bypass — set in Railway env to disable OTP for demo/dev ─────
    if (process.env.SKIP_OTP === 'true') {
      const { password_hash: _ph, ...safeUser } = user
      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role, scholar_no: user.scholar_no, section: user.section, house: user.house },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      )
      setAuthCookie(res, token)
      return res.json({ user: safeUser })
    }

    // ── Generate and store login OTP ─────────────────────────────────────────
    const otp       = genOtp()
    const sessionId = randomUUID()
    const otpHash   = await bcrypt.hash(otp, 8) // fast hash — just needs tampering protection

    const { password_hash, ...safeUser } = user

    loginOtpStore.set(sessionId, {
      userId:      user.id,
      userObj:     safeUser,
      otpHash,
      expiresAt:   Date.now() + 10 * 60 * 1000, // 10 minutes
      attempts:    0,   // wrong OTP guesses — session killed at 5
      resendCount: 0,   // regenerations — capped at 3
    })

    // ── Send OTP email ────────────────────────────────────────────────────────
    const smtpConfigured = !!process.env.SMTP_HOST
    try {
      await sendLoginOtpEmail(user.email, user.name, otp)
    } catch (emailErr) {
      console.error('[OTP] Email send failed:', emailErr.message)
      loginOtpStore.delete(sessionId) // clean up orphaned session
      if (smtpConfigured) {
        return res.status(500).json({
          error: 'Could not send the verification email. Please try again in a moment.',
        })
      }
    }

    const response = {
      requiresOtp: true,
      sessionId,
      maskedEmail: user.email.replace(/(.{2}).+(@.+)/, '$1***$2'),
    }

    // In dev (no SMTP) expose OTP so demo still works
    if (!smtpConfigured && process.env.NODE_ENV !== 'production') {
      response.devOtp = otp
      response.devNote = 'SMTP not configured — OTP shown here for development only'
    }

    res.json(response)
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// POST /api/auth/verify-login-otp — Step 2: verify OTP → set auth cookie
router.post('/verify-login-otp', async (req, res) => {
  try {
    const { sessionId, otp } = req.body
    if (!sessionId || !otp) {
      return res.status(400).json({ error: 'sessionId and otp are required' })
    }

    const session = loginOtpStore.get(sessionId)
    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' })
    }

    if (session.expiresAt < Date.now()) {
      loginOtpStore.delete(sessionId)
      return res.status(401).json({ error: 'OTP has expired. Please log in again.' })
    }

    // ── Attempt limit: kill session after 5 wrong guesses ────────────────────
    session.attempts++
    if (session.attempts > 5) {
      loginOtpStore.delete(sessionId)
      return res.status(429).json({ error: 'Too many incorrect attempts. Please log in again.' })
    }

    const match = await bcrypt.compare(otp.trim(), session.otpHash)
    if (!match) {
      const remaining = 5 - session.attempts
      if (remaining === 0) {
        loginOtpStore.delete(sessionId)
        return res.status(429).json({ error: 'Too many incorrect attempts. Please log in again.' })
      }
      return res.status(401).json({
        error: 'Incorrect OTP. Please try again.',
        attemptsRemaining: remaining,
      })
    }

    // ── OTP valid — issue JWT cookie ──────────────────────────────────────────
    loginOtpStore.delete(sessionId) // one-time use

    const u = session.userObj
    const token = jwt.sign(
      { id: u.id, name: u.name, email: u.email, role: u.role, scholar_no: u.scholar_no, section: u.section, house: u.house },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    setAuthCookie(res, token)
    res.json({ token, user: u })
  } catch (err) {
    console.error('verify-login-otp error:', err)
    res.status(500).json({ error: 'OTP verification failed' })
  }
})

// POST /api/auth/resend-login-otp — resend OTP for existing session
router.post('/resend-login-otp', async (req, res) => {
  try {
    const { sessionId } = req.body
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' })

    const session = loginOtpStore.get(sessionId)
    if (!session) return res.status(401).json({ error: 'Session expired. Please log in again.' })

    // ── Server-side resend cap: max 3 resends per session ────────────────────
    session.resendCount++
    if (session.resendCount > 3) {
      loginOtpStore.delete(sessionId)
      return res.status(429).json({ error: 'Maximum resend limit reached. Please log in again.' })
    }

    // Fetch user email/name from DB
    const { data: user } = await supabase
      .from('users').select('email, name').eq('id', session.userId).single()
    if (!user) return res.status(404).json({ error: 'User not found' })

    const otp = genOtp()
    session.otpHash   = await bcrypt.hash(otp, 8)
    session.expiresAt = Date.now() + 10 * 60 * 1000
    session.attempts  = 0 // reset attempt count on fresh OTP

    const smtpConfigured = !!process.env.SMTP_HOST
    try { await sendLoginOtpEmail(user.email, user.name, otp) } catch {}

    const response = { ok: true, maskedEmail: user.email.replace(/(.{2}).+(@.+)/, '$1***$2') }
    if (!smtpConfigured && process.env.NODE_ENV !== 'production') { response.devOtp = otp; response.devNote = 'SMTP not configured' }
    res.json(response)
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend OTP' })
  }
})

// ── Phone OTP (for phone verification + WhatsApp opt-in) ────────────────────

// POST /api/auth/send-phone-otp — send SMS OTP to provided phone number
router.post('/send-phone-otp', verifyToken, async (req, res) => {
  try {
    const { phone } = req.body
    if (!phone || !/^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' })
    }

    const phone10 = phone.replace(/\s/g, '')
    const sessionId = randomUUID()

    // Try to send via MSG91; if not configured, use devOtp fallback
    const msg91Configured = !!process.env.MSG91_AUTH_KEY && !!process.env.MSG91_OTP_TEMPLATE_ID
    let otp

    if (msg91Configured) {
      const result = await sendSmsOtp(phone10)
      otp = result.otp
    } else {
      otp = genOtp()
      console.log(`[PhoneOTP-DEV] OTP for 91${phone10}: ${otp}`)
    }

    phoneOtpStore.set(sessionId, {
      userId:    req.user.id,
      phone:     phone10,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    })

    const response = { ok: true, sessionId, maskedPhone: `***${phone10.slice(-3)}` }
    if (!msg91Configured && process.env.NODE_ENV !== 'production') {
      response.devOtp  = otp
      response.devNote = 'MSG91 not configured — OTP shown here for development'
    }
    res.json(response)
  } catch (err) {
    console.error('send-phone-otp error:', err)
    res.status(500).json({ error: err.message || 'Failed to send OTP' })
  }
})

// POST /api/auth/verify-phone-otp — verify OTP and save phone as verified
router.post('/verify-phone-otp', verifyToken, async (req, res) => {
  try {
    const { sessionId, otp, whatsappOptIn } = req.body
    if (!sessionId || !otp) {
      return res.status(400).json({ error: 'sessionId and otp are required' })
    }

    const session = phoneOtpStore.get(sessionId)
    if (!session) return res.status(401).json({ error: 'Session expired. Please request a new OTP.' })
    if (session.userId !== req.user.id) return res.status(403).json({ error: 'Session mismatch' })
    if (session.expiresAt < Date.now()) {
      phoneOtpStore.delete(sessionId)
      return res.status(401).json({ error: 'OTP expired. Please request a new one.' })
    }

    // Verify OTP
    const msg91Configured = !!process.env.MSG91_AUTH_KEY && !!process.env.MSG91_OTP_TEMPLATE_ID
    if (msg91Configured) {
      // Let MSG91 verify (it tracks internally)
      try {
        await verifySmsOtp(session.phone, otp.trim())
      } catch {
        return res.status(401).json({ error: 'Incorrect OTP. Please try again.' })
      }
    } else {
      // Dev mode: compare directly
      if (otp.trim() !== session.otp) {
        return res.status(401).json({ error: 'Incorrect OTP. Please try again.' })
      }
    }

    phoneOtpStore.delete(sessionId)

    // Save verified phone + WhatsApp opt-in to user profile
    await supabase
      .from('users')
      .update({
        phone:           session.phone,
        phone_verified:  true,
        whatsapp_opt_in: !!whatsappOptIn,
      })
      .eq('id', req.user.id)

    res.json({
      ok:              true,
      phone_verified:  true,
      whatsapp_opt_in: !!whatsappOptIn,
      message:         `Phone ${session.phone.slice(0,2)}****${session.phone.slice(-3)} verified successfully.${whatsappOptIn ? ' WhatsApp notifications enabled.' : ''}`,
    })
  } catch (err) {
    console.error('verify-phone-otp error:', err)
    res.status(500).json({ error: 'Verification failed' })
  }
})

// PATCH /api/auth/whatsapp-optin — toggle WhatsApp opt-in without re-verifying phone
router.patch('/whatsapp-optin', verifyToken, async (req, res) => {
  try {
    const { enabled } = req.body
    const { data: user } = await supabase
      .from('users').select('phone_verified').eq('id', req.user.id).single()

    if (!user?.phone_verified) {
      return res.status(400).json({ error: 'Please verify your phone number first.' })
    }

    await supabase
      .from('users')
      .update({ whatsapp_opt_in: !!enabled })
      .eq('id', req.user.id)

    res.json({ ok: true, whatsapp_opt_in: !!enabled })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update WhatsApp preference' })
  }
})

// GET /api/auth/me
 router.get('/me', verifyToken, async (req, res) => {
   try {
     const { data: user, error } = await supabase
       .from('users')
        .select('id, name, email, role, scholar_no, section, house, vpc_status, is_privacy_acknowledged, privacy_acknowledged_at, onboarding_completed, created_at')
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

// ── OTP-Based VPC Verification (B3 Task #80) ────────────────────────────────

// POST /api/auth/vpc-otp-request — send OTP to parent's phone for VPC verification
router.post('/vpc-otp-request', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students need VPC verification' })
    }

    const { phone } = req.body
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Valid 10-digit phone number required' })
    }

    // Check if MSG91 is configured
    const msg91Configured = !!process.env.MSG91_AUTH_KEY && !!process.env.MSG91_OTP_TEMPLATE_ID
    let otp

    if (msg91Configured) {
      const result = await sendSmsOtp(phone)
      otp = result.otp
    } else {
      otp = Math.floor(100000 + Math.random() * 900000).toString()
      console.log(`[VPC-SMS-DEV] OTP for 91${phone}: ${otp}`)
    }

    // Store OTP in phoneOtpStore for later verification
    const sessionId = randomUUID()
    phoneOtpStore.set(sessionId, {
      userId: req.user.id,
      phone,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    })

    const response = { ok: true, sessionId, maskedPhone: `***${phone.slice(-3)}` }
    if (!msg91Configured && process.env.NODE_ENV !== 'production') {
      response.devOtp = otp
      response.devNote = 'MSG91 not configured — OTP shown here for development'
    }
    res.json(response)
  } catch (err) {
    console.error('VPC OTP request error:', err)
    res.status(500).json({ error: err.message || 'Failed to send OTP' })
  }
})

// POST /api/auth/vpc-otp-verify — verify OTP and grant VPC
router.post('/vpc-otp-verify', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students need VPC verification' })
    }

    const { sessionId, otp } = req.body
    if (!sessionId || !otp) {
      return res.status(400).json({ error: 'sessionId and otp are required' })
    }

    const session = phoneOtpStore.get(sessionId)
    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid' })
    }
    if (session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Session mismatch' })
    }
    if (session.expiresAt < Date.now()) {
      phoneOtpStore.delete(sessionId)
      return res.status(401).json({ error: 'OTP expired' })
    }

    // Verify OTP
    const msg91Configured = !!process.env.MSG91_AUTH_KEY && !!process.env.MSG91_OTP_TEMPLATE_ID
    if (msg91Configured) {
      try {
        await verifySmsOtp(session.phone, otp.trim())
      } catch {
        return res.status(401).json({ error: 'Incorrect OTP' })
      }
    } else {
      if (otp.trim() !== session.otp) {
        return res.status(401).json({ error: 'Incorrect OTP' })
      }
    }

    phoneOtpStore.delete(sessionId)

    // Grant VPC
    await supabase
      .from('users')
      .update({ vpc_status: 'granted' })
      .eq('id', req.user.id)

    res.json({ ok: true, vpc_status: 'granted' })
  } catch (err) {
    console.error('VPC OTP verify error:', err)
    res.status(500).json({ error: 'Verification failed' })
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
