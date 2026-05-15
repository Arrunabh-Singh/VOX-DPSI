import supabase from '../db/supabase.js'
import bcrypt from 'bcryptjs'

const FIX_TOKEN = 'vox-fix-2026-05-15-secure-token'

export default function registerFixRoutes(app) {
  // TEMPORARY: Database fix endpoint — remove after use
  app.post('/api/__admin/fix-database', async (req, res) => {
    if (req.body.token !== FIX_TOKEN) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    try {
      const results = []

      // 1. Get all users
      const { data: users } = await supabase.from('users').select('*').order('role')
      results.push(`Found ${users.length} users`)

      // 2. Fix VP account
      const vpHash = await bcrypt.hash('demo123', 12)
      const vp = users.find(u => u.role === 'vice_principal')
      if (vp) {
        await supabase.from('users').update({ password_hash: vpHash, is_privacy_acknowledged: true }).eq('id', vp.id)
        results.push(`Fixed VP: ${vp.email}`)
      }

      // 3. Fix background students
      const bgStudents = users.filter(u => u.role === 'student' && u.email.includes('@bg.'))
      if (bgStudents.length > 0) {
        await supabase.from('users').update({ is_privacy_acknowledged: true, vpc_status: 'granted' })
          .in('id', bgStudents.map(s => s.id))
        results.push(`Fixed ${bgStudents.length} background students`)
      }

      // 4. Distribute complaints across council members
      const { data: complaints } = await supabase.from('complaints').select('*').order('complaint_no')
      const councilMembers = users.filter(u => u.role === 'council_member')
      if (councilMembers.length > 0 && complaints.length > 0) {
        for (let i = 0; i < complaints.length; i++) {
          const newCouncilId = councilMembers[i % councilMembers.length].id
          if (complaints[i].assigned_council_member_id !== newCouncilId) {
            await supabase.from('complaints').update({ assigned_council_member_id: newCouncilId })
              .eq('id', complaints[i].id)
          }
        }
        results.push(`Distributed ${complaints.length} complaints across ${councilMembers.length} council members`)
      }

      // 5. Remove duplicate timeline entries
      const { data: timeline } = await supabase.from('complaint_timeline').select('*').order('created_at')
      const seen = new Map()
      const toDelete = []
      for (const entry of timeline) {
        const key = entry.complaint_id + '-' + entry.action + '-' + entry.performed_by_role
        const existing = seen.get(key)
        if (existing && (new Date(entry.created_at) - new Date(existing.created_at)) < 2000) {
          toDelete.push(entry.id)
        } else {
          seen.set(key, entry)
        }
      }
      if (toDelete.length > 0) {
        await supabase.from('complaint_timeline').delete().in('id', toDelete)
        results.push(`Removed ${toDelete.length} duplicate timeline entries`)
      }

      // 6. Get final state
      const { data: finalComplaints } = await supabase.from('complaints').select('id, assigned_council_member_id, status').order('complaint_no')
      const distribution = {}
      for (const c of finalComplaints) {
        const cid = c.assigned_council_member_id || 'NULL'
        distribution[cid] = (distribution[cid] || 0) + 1
      }

      res.json({ success: true, results, distribution: Object.entries(distribution).map(([id, count]) => ({
        user: users.find(u => u.id === id)?.name || 'NULL',
        count
      })) })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })
}
