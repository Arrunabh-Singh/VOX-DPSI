#!/usr/bin/env node
/**
 * Vox DPSI — Comprehensive Database Fix Script
 * Run with: node fix_database.js
 * Requires SUPABASE_SERVICE_KEY env var
 */
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = 'https://gznhziptmydkalsrazpj.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_KEY not set')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

const results = []

async function run() {
  console.log('=== Vox DPSI Database Fix Script ===\n')

  // 1. Get all users
  const { data: users } = await supabase.from('users').select('*').order('role')
  console.log(`Users: ${users.length}`)
  
  // 2. Fix VP account
  const vpHash = await bcrypt.hash('demo123', 12)
  const vp = users.find(u => u.role === 'vice_principal')
  if (vp) {
    await supabase.from('users').update({
      password_hash: vpHash,
      is_privacy_acknowledged: true,
      vpc_status: 'not_required'
    }).eq('id', vp.id)
    results.push(`Fixed VP account: ${vp.email}`)
  }

  // 3. Fix all background students
  const bgStudents = users.filter(u => u.role === 'student' && u.email.includes('@bg.'))
  for (const s of bgStudents) {
    await supabase.from('users').update({
      is_privacy_acknowledged: true,
      vpc_status: 'granted'
    }).eq('id', s.id)
  }
  results.push(`Fixed ${bgStudents.length} background students (privacy + vpc)`)

  // 4. Get all complaints
  const { data: complaints } = await supabase.from('complaints').select('*').order('complaint_no')
  console.log(`Complaints: ${complaints.length}`)

  // 5. Distribute complaints across council members
  const councilMembers = users.filter(u => u.role === 'council_member')
  if (councilMembers.length > 0) {
    for (let i = 0; i < complaints.length; i++) {
      const newCouncilId = councilMembers[i % councilMembers.length].id
      if (complaints[i].assigned_council_member_id !== newCouncilId) {
        await supabase.from('complaints').update({
          assigned_council_member_id: newCouncilId
        }).eq('id', complaints[i].id)
      }
    }
    results.push(`Distributed ${complaints.length} complaints across ${councilMembers.length} council members`)
  }

  // 6. Remove duplicate timeline entries
  const { data: timeline } = await supabase.from('complaint_timeline').select('*').order('created_at')
  const seen = new Map()
  const toDelete = []
  for (const entry of timeline) {
    const key = `${entry.complaint_id}-${entry.action}-${entry.performed_by_role}`
    const existing = seen.get(key)
    if (existing) {
      const timeDiff = new Date(entry.created_at) - new Date(existing.created_at)
      if (timeDiff < 2000) {
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

  // 7. Print summary
  console.log('\n=== Results ===')
  for (const r of results) {
    console.log(`  ✅ ${r}`)
  }
  console.log('\nDone!')
}

run().catch(err => {
  console.error('ERROR:', err.message)
  process.exit(1)
})
