import express from 'express'
import supabase from './db/supabase.js'
import bcrypt from 'bcryptjs'

const router = express.Router()

// TEMPORARY: Database fix endpoint — remove after use
router.post('/api/__fix-database', async (req, res) => {
  try {
    const results = []

    // 1. Fix VP account - ensure it exists with correct hash
    const vpHash = await bcrypt.hash('demo123', 12)
    const { data: existingVp } = await supabase.from('users').select('id').eq('email', 'vp@dpsi.com').single()
    if (!existingVp) {
      await supabase.from('users').insert({
        id: '77777777-7777-7777-7777-777777777777',
        name: 'Dr. Meena Kapoor',
        email: 'vp@dpsi.com',
        password_hash: vpHash,
        role: 'vice_principal',
        is_privacy_acknowledged: true,
        vpc_status: 'not_required'
      })
      results.push('Created VP account')
    } else {
      await supabase.from('users').update({
        password_hash: vpHash,
        is_privacy_acknowledged: true,
        vpc_status: 'not_required'
      }).eq('email', 'vp@dpsi.com')
      results.push('Updated VP account')
    }

    // 2. Fix all background students - set privacy acknowledged and vpc granted
    await supabase.from('users').update({
      is_privacy_acknowledged: true,
      vpc_status: 'granted'
    }).eq('role', 'student').eq('is_privacy_acknowledged', false)
    results.push('Fixed student privacy/vpc status')

    // 3. Get all council members
    const { data: councilMembers } = await supabase.from('users').select('id').eq('role', 'council_member')
    const councilIds = councilMembers.map(c => c.id)

    // 4. Distribute complaints across council members
    const { data: complaints } = await supabase.from('complaints').select('id, assigned_council_member_id').order('complaint_no')
    if (councilIds.length > 0 && complaints.length > 0) {
      for (let i = 0; i < complaints.length; i++) {
        const newCouncilId = councilIds[i % councilIds.length]
        if (complaints[i].assigned_council_member_id !== newCouncilId) {
          await supabase.from('complaints').update({
            assigned_council_member_id: newCouncilId
          }).eq('id', complaints[i].id)
        }
      }
      results.push(`Distributed ${complaints.length} complaints across ${councilIds.length} council members`)
    }

    // 5. Remove duplicate timeline entries (keep first, remove duplicates within 1 second)
    const { data: allTimeline } = await supabase.from('complaint_timeline').select('*').order('created_at')
    const seen = new Map()
    const toDelete = []
    for (const entry of allTimeline) {
      const key = `${entry.complaint_id}-${entry.action}-${entry.performed_by_role}`
      const existing = seen.get(key)
      if (existing) {
        const timeDiff = new Date(entry.created_at) - new Date(existing.created_at)
        if (timeDiff < 2000) { // Within 2 seconds = duplicate
          toDelete.push(entry.id)
        }
      } else {
        seen.set(key, entry)
      }
    }
    if (toDelete.length > 0) {
      await supabase.from('complaint_timeline').delete().in('id', toDelete)
      results.push(`Removed ${toDelete.length} duplicate timeline entries`)
    }

    // 6. Add self-ping to prevent Render sleep
    results.push('Self-ping: Add RENDER_EXTERNAL_URL to env vars and add setInterval in index.js')

    res.json({ success: true, results })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
