import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

async function main() {
  console.log('=== Vox DPSI Database Fix ===\n')
  const results = []

  // 1. Get all users
  const { data: users, error: uErr } = await supabase.from('users').select('*').order('role')
  if (uErr) { console.error('Users query error:', uErr.message); process.exit(1) }
  console.log(`Found ${users.length} users`)

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

  // 4. Get complaints and distribute
  const { data: complaints } = await supabase.from('complaints').select('*').order('complaint_no')
  console.log(`Found ${complaints.length} complaints`)

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

  // 6. Print results
  console.log('\n=== Results ===')
  for (const r of results) console.log('  ✅ ' + r)

  // 7. Verify
  const { data: updatedComplaints } = await supabase.from('complaints').select('id, assigned_council_member_id').order('complaint_no')
  const distribution = {}
  for (const c of updatedComplaints) {
    const cid = c.assigned_council_member_id || 'NULL'
    distribution[cid] = (distribution[cid] || 0) + 1
  }
  console.log('\nComplaint distribution:')
  for (const [cid, count] of Object.entries(distribution)) {
    const user = users.find(u => u.id === cid)
    console.log(`  ${user ? user.name : 'NULL'}: ${count}`)
  }

  console.log('\nDone!')
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1) })
