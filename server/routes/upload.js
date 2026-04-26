import express from 'express'
import multer from 'multer'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('File type not allowed'))
  }
})

// POST /api/upload
router.post('/', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' })

    const ext = (req.file.originalname.split('.').pop() || 'bin').toLowerCase()
    const safeExt = ['jpg','jpeg','png','gif','webp','pdf','doc','docx'].includes(ext) ? ext : 'bin'
    const fileName = `complaints/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`

    // Ensure bucket exists (create if not)
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = (buckets || []).some(b => b.name === 'attachments')
    if (!bucketExists) {
      await supabase.storage.createBucket('attachments', { public: true })
    }

    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
        cacheControl: '3600',
      })

    if (error) {
      console.error('Supabase storage error:', error)
      return res.status(500).json({ error: 'Storage upload failed: ' + error.message })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('attachments')
      .getPublicUrl(fileName)

    res.json({ url: publicUrl, path: fileName })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: 'Upload failed: ' + (err.message || 'Unknown error') })
  }
})

export default router
