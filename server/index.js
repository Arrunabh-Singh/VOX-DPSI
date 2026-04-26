import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.js'
import complaintRoutes from './routes/complaints.js'
import timelineRoutes from './routes/timeline.js'
import uploadRoutes from './routes/upload.js'
import userRoutes from './routes/users.js'
import notificationRoutes from './routes/notifications.js'
import notesRoutes from './routes/notes.js'
import { startAutoEscalateCron } from './jobs/autoEscalate.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/complaints', complaintRoutes)
app.use('/api/complaints/:id/timeline', timelineRoutes)
app.use('/api/complaints/:id/notes', notesRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/users', userRoutes)
app.use('/api/notifications', notificationRoutes)

// ── Health check (also at /api/health for keep-alive pings from client) ──────
app.get('/health',     (req, res) => res.json({ status: 'ok', ts: Date.now() }))
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }))

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }))

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`🚀 Vox DPSI server running on http://localhost:${PORT}`)
  startAutoEscalateCron()
})

export default app
