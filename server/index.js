import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/auth.js'
import { verifyToken } from './middleware/auth.js'
import { allowRoles } from './middleware/roleGuard.js'
import complaintRoutes from './routes/complaints.js'
import timelineRoutes from './routes/timeline.js'
import uploadRoutes from './routes/upload.js'
import userRoutes from './routes/users.js'
import notificationRoutes from './routes/notifications.js'
import notesRoutes from './routes/notes.js'
import suggestionRoutes from './routes/suggestions.js'
import auditLogRoutes from './routes/auditLog.js'
import workflowTemplateRoutes from './routes/workflowTemplates.js'
import resolutionTemplateRoutes from './routes/resolutionTemplates.js'
import delegationRoutes from './routes/delegations.js'
import safeDialogueRoutes from './routes/safeDialogue.js'
import guardianRoutes from './routes/guardian.js'
import configRoutes from './routes/config.js'
import { startAutoEscalateCron, startRetentionCron, startTermExpiryCron, startDailyDigestCron } from './jobs/autoEscalate.js'

dotenv.config()

const app = express()
app.set('trust proxy', 1)
const PORT = process.env.PORT || 5000

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.CLIENT_URL || 'http://localhost:5173'],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
})

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const complaintCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many complaints submitted. Please wait before submitting again.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Upload limit reached. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

const DANGEROUS = /<script[\s\S]*?>[\s\S]*?<\/script>|<\/?(script|iframe|object|embed|link|meta)[^>]*>|on\w+\s*=\s*["'][^"']*["']/gi
function sanitizeBody(obj) {
  if (!obj || typeof obj !== 'object') return obj
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key].replace(DANGEROUS, '')
    } else if (typeof obj[key] === 'object') {
      sanitizeBody(obj[key])
    }
  }
  return obj
}
app.use((req, res, next) => { sanitizeBody(req.body); next() })

app.use('/api', apiLimiter)

app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/complaints', complaintRoutes)
app.use('/api/complaints/:id/timeline', timelineRoutes)
app.use('/api/complaints/:id/notes', notesRoutes)
app.use('/api/upload', uploadLimiter, uploadRoutes)
app.use('/api/users', userRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/suggestions', suggestionRoutes)
app.use('/api/audit-log', auditLogRoutes)
app.use('/api/workflow-templates', workflowTemplateRoutes)
app.use('/api/resolution-templates', resolutionTemplateRoutes)
app.use('/api/delegations', delegationRoutes)
app.use('/api/safe-dialogue', safeDialogueRoutes)
app.use('/api/guardian', guardianRoutes)
app.use('/api/config', configRoutes)

app.get('/api/test-whatsapp', verifyToken, allowRoles('principal', 'vice_principal'), async (req, res) => {
  const { notifyAdminAlert } = await import('./services/notifications.js')
  const adminWA = process.env.ADMIN_WHATSAPP_NUMBER
  if (!adminWA) return res.json({ ok: false, reason: 'ADMIN_WHATSAPP_NUMBER not set' })
  try {
    await notifyAdminAlert(adminWA, 'Test message from Vox DPSI')
    res.json({ ok: true, to: adminWA, from: process.env.TWILIO_WHATSAPP_FROM || 'sandbox' })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    ts: Date.now(),
    uptime_seconds: Math.floor(process.uptime()),
    env: process.env.NODE_ENV || 'development',
    version: '2.0.0'
  })
})

app.use((req, res) => res.status(404).json({ error: 'Route not found' }))

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Vox DPSI server running on http://localhost:${PORT}`)
  startAutoEscalateCron()
  startRetentionCron()
  startTermExpiryCron()
  startDailyDigestCron()
})

export default app
