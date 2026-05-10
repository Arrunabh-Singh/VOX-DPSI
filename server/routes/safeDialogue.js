import express from 'express'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'
import { allowRoles } from '../middleware/roleGuard.js'

const router = express.Router()

// POST /api/safe-dialogue — student sends an anonymous message to school counsellor
router.post('/', verifyToken, async (req, res) => {
  try {
    const { message, is_anonymous } = req.body

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' })
    }
    const trimmed = message.trim()
    if (trimmed.length < 10) {
      return res.status(400).json({ error: 'Message must be at least 10 characters' })
    }

    // BUG B FIX: Only store student_id if not anonymous
    const studentId = is_anonymous ? null : req.user.id

    const { data, error } = await supabase
      .from('safe_dialogues')
      .insert({
        message: trimmed,
        is_anonymous: !!is_anonymous,
        student_id: studentId,
        status: 'open',
        created_at: new Date().toISOString(),
      })
      .select('id, message, is_anonymous, student_id, status, created_at')
      .single()

    if (error) throw error

    // Do not expose student_id in response if anonymous
    const response = { ...data }
    if (data.is_anonymous) {
      delete response.student_id
    }

    res.status(201).json(response)
  } catch (err) {
    console.error('Safe dialogue error:', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// GET /api/safe-dialogue — counsellor/coordinator/principal views inbox (anonymous messages anonymized)
router.get('/', verifyToken, allowRoles('coordinator', 'principal', 'supervisor', 'vice_principal'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('safe_dialogues')
      .select(`
        id,
        message,
        is_anonymous,
        status,
        created_at,
        replied_at,
        counselor_reply,
        replied_by,
        student:student_id ( id, name, scholar_no, section, house )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Anonymize: if message is anonymous or student_id is null, replace student info with generic anonymous object
    const shaped = (data || []).map(item => {
      if (item.is_anonymous || !item.student_id) {
        return {
          id: item.id,
          message: item.message,
          is_anonymous: true,
          status: item.status,
          created_at: item.created_at,
          replied_at: item.replied_at,
          counselor_reply: item.counselor_reply,
          replied_by: item.replied_by,
          student: { name: 'Anonymous', id: null, scholar_no: null, section: null, house: null }
        }
      }
      return item
    })

    res.json(shaped)
  } catch (err) {
    console.error('Safe dialogue fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

// PATCH /api/safe-dialogue/:id/reply — counsellor replies to a message
router.patch('/:id/reply', verifyToken, allowRoles('coordinator', 'principal', 'supervisor', 'vice_principal'), async (req, res) => {
  try {
    const { id } = req.params
    const { reply } = req.body

    if (!reply || typeof reply !== 'string') {
      return res.status(400).json({ error: 'Reply is required' })
    }
    const trimmedReply = reply.trim()
    if (trimmedReply.length < 5) {
      return res.status(400).json({ error: 'Reply must be at least 5 characters' })
    }

    const updatePayload = {
      counselor_reply: trimmedReply,
      replied_by: req.user.id,
      status: 'replied',
      replied_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('safe_dialogues')
      .update(updatePayload)
      .eq('id', id)
      .select('id, counselor_reply, replied_by, status, replied_at')
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return res.status(404).json({ error: 'Message not found' })
      }
      throw error
    }

    res.json(data)
  } catch (err) {
    console.error('Safe dialogue reply error:', err)
    res.status(500).json({ error: 'Failed to send reply' })
  }
})

export default router
