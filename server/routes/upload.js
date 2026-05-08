import express from 'express'
import multer from 'multer'
import sharp from 'sharp'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// ── Allowed MIME types ────────────────────────────────────────────────────────
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

// GIF is intentionally excluded — animated GIFs can contain polyglot payloads

// ── Magic byte signatures (file-type validation independent of MIME spoofing) ─
const MAGIC_SIGNATURES = [
  { mime: 'image/jpeg',  magic: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',   magic: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/webp',  magic: null, check: buf => buf.length >= 12 && buf.slice(0,4).toString() === 'RIFF' && buf.slice(8,12).toString() === 'WEBP' },
  { mime: 'application/pdf',  magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: 'application/msword', magic: [0xD0, 0xCF, 0x11, 0xE0] }, // OLE2 header
  { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    magic: [0x50, 0x4B, 0x03, 0x04] }, // PK (ZIP) — docx is a zip
]

function validateMagicBytes(buffer, declaredMime) {
  const sig = MAGIC_SIGNATURES.find(s => s.mime === declaredMime)
  if (!sig) return false
  if (sig.check) return sig.check(buffer) // custom check function
  if (!sig.magic) return false
  return sig.magic.every((byte, i) => buffer[i] === byte)
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true)
    else cb(new Error('File type not allowed. Accepted: JPEG, PNG, WebP, PDF, DOC, DOCX'))
  },
})

// POST /api/upload
router.post('/', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' })

    const { buffer, mimetype, originalname } = req.file

    // ── Magic byte validation ─────────────────────────────────────────────────
    // Rejects files where the declared MIME doesn't match actual binary content.
    // This prevents polyglot attacks (e.g. a PHP file renamed to .jpg).
    if (!validateMagicBytes(buffer, mimetype)) {
      return res.status(400).json({ error: 'File content does not match its declared type. Upload rejected.' })
    }

    // ── EXIF / metadata stripping for images ──────────────────────────────────
    // sharp re-encodes the image, dropping all EXIF metadata including GPS coordinates,
    // device info, and embedded thumbnails. This protects student privacy.
    let processedBuffer = buffer
    let processedMime = mimetype

    if (['image/jpeg', 'image/png', 'image/webp'].includes(mimetype)) {
      try {
        processedBuffer = await sharp(buffer)
          .rotate()
          .toBuffer()
        // Output format stays the same; sharp re-encodes in the same format by default
      } catch (sharpErr) {
        console.error('EXIF strip failed — rejecting upload:', sharpErr.message)
        return res.status(400).json({ error: 'Image processing failed. Please try a different image.' })
      }
    }

    // ── Safe filename ─────────────────────────────────────────────────────────
    const EXT_MAP = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    }
    const safeExt = EXT_MAP[mimetype] || 'bin'
    const fileName = `complaints/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`

    // ── Supabase Storage upload ───────────────────────────────────────────────
    // Bucket policy: private (not public). Attachments are sensitive student data;
    // they must never be accessible via a guessable public URL (#55).
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = (buckets || []).some(b => b.name === 'attachments')
    if (!bucketExists) {
      // Create private bucket — public: false ensures no public URL is ever issued
      await supabase.storage.createBucket('attachments', { public: false })
    }

    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(fileName, processedBuffer, {
        contentType: processedMime,
        upsert: false,
        cacheControl: '3600',
      })

    if (error) {
      console.error('Supabase storage error:', error)
      return res.status(500).json({ error: 'Storage upload failed: ' + error.message })
    }

    // Issue a short-lived signed URL (1 hour). The raw storage path is stored in the DB;
    // a fresh signed URL is generated each time the complaint detail is fetched.
    // This means a leaked DB record never yields a working file URL.
    const { data: signedData, error: signedErr } = await supabase.storage
      .from('attachments')
      .createSignedUrl(fileName, 60 * 60) // 1 hour TTL

    if (signedErr) {
      console.error('Signed URL error:', signedErr)
      return res.status(500).json({ error: 'Could not create signed URL: ' + signedErr.message })
    }

    res.json({
      url: signedData.signedUrl,  // short-lived — expires in 1 hour
      path: fileName,              // stored in DB; use to refresh URL on complaint fetch
      exif_stripped: ['image/jpeg', 'image/png', 'image/webp'].includes(mimetype),
    })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: 'Upload failed: ' + (err.message || 'Unknown error') })
  }
})

// GET /api/upload/signed-url?path=complaints/...
// Refreshes an expired signed URL for an attachment stored in Supabase Storage.
// Requires authentication; validates the path is within the complaints/ prefix.
router.get('/signed-url', verifyToken, async (req, res) => {
  try {
    const { path: storagePath } = req.query
    if (!storagePath || !storagePath.startsWith('complaints/')) {
      return res.status(400).json({ error: 'Invalid storage path' })
    }

    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(storagePath, 60 * 60) // 1 hour

    if (error) return res.status(500).json({ error: 'Could not generate signed URL' })
    res.json({ url: data.signedUrl })
  } catch (err) {
    res.status(500).json({ error: 'Signed URL generation failed' })
  }
})

// Exported helper used by the complaints route to hydrate attachment_url on fetch
export async function getSignedAttachmentUrl(storagePath) {
  if (!storagePath) return null
  // If already a full signed URL (legacy data), return as-is
  if (storagePath.startsWith('http')) {
    // Try to extract the path segment if it looks like a Supabase public URL
    const match = storagePath.match(/\/object\/(?:public|sign)\/attachments\/(.+?)(?:\?|$)/)
    if (!match) return storagePath // can't parse — return unchanged
    storagePath = match[1] // fall through to sign it properly
  }
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(storagePath, 60 * 60)
  if (error) return null
  return data.signedUrl
}

export default router
