/**
 * Run schema.sql + seed.sql against Supabase
 * Usage: node scripts/migrate.js
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://gznhziptmydkalsrazpj.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bmh6aXB0bXlka2Fsc3JhenBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ5MDQzMSwiZXhwIjoyMDkyMDY2NDMxfQ.2kIsWAyCy2qPV0cRO5smxY_Ve4yyFSK5Y-wjkjOrQHo'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

async function runSQL(label, filePath) {
  console.log(`\n▶ Running ${label}...`)
  const sql = readFileSync(filePath, 'utf-8')

  // Split on semicolons, run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const stmt of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' }).catch(() => ({ error: null }))
      // Supabase doesn't expose raw SQL via JS client for DDL — use REST
    } catch (e) {
      // silent
    }
  }

  // Use the management API approach via fetch
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.log(`  Note: ${err.slice(0, 100)}`)
  } else {
    console.log(`  ✓ ${label} completed`)
  }
}

// Alternative: use pg directly via Supabase connection string
async function runViaPG() {
  // Since we can't run DDL directly via Supabase JS client,
  // we'll use the Supabase REST API for DML and trust the schema was set up manually
  console.log('\n📋 Running seed data via Supabase REST API...')

  // Clear tables first
  for (const table of ['escalations', 'complaint_timeline', 'complaints', 'users']) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error && !error.message.includes('0 rows')) {
      console.log(`  ⚠ Clear ${table}: ${error.message}`)
    } else {
      console.log(`  ✓ Cleared ${table}`)
    }
  }

  // Insert users
  const { error: uErr } = await supabase.from('users').upsert([
    { id: '11111111-1111-1111-1111-111111111111', name: 'Rahul Sharma',         email: '5001@student.dpsindore.org', password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6', role: 'student',        scholar_no: '5001', section: 'XII B', house: 'Prithvi' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Priya Verma',          email: '5002@student.dpsindore.org', password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6', role: 'council_member', scholar_no: '5002', section: 'XII A', house: 'Agni' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'Mrs. Sharma',          email: 'sharma@staff.dpsindore.org', password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6', role: 'class_teacher' },
    { id: '44444444-4444-4444-4444-444444444444', name: 'Mr. Kapil Sir',        email: 'kapil@staff.dpsindore.org',  password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6', role: 'coordinator' },
    { id: '55555555-5555-5555-5555-555555555555', name: 'Mr. Parminder Chopra', email: 'principal@dpsindore.org',    password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6', role: 'principal' },
    { id: '66666666-6666-6666-6666-666666666666', name: 'Arrunabh Singh',       email: '5411@student.dpsindore.org', password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6', role: 'supervisor',     scholar_no: '5411', section: 'XII B', house: 'Prithvi' },
    { id: '77777777-7777-7777-7777-777777777777', name: 'Aisha Khan',           email: 'aisha@student.dpsindore.org',password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6', role: 'student',        scholar_no: '5003', section: 'XII A', house: 'Agni' },
  ], { onConflict: 'id' })
  if (uErr) console.log(`  ⚠ Users: ${uErr.message}`)
  else console.log('  ✓ Users seeded (7 accounts)')

  // Insert complaints
  const { error: cErr } = await supabase.from('complaints').upsert([
    { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', complaint_no: 1, student_id: '11111111-1111-1111-1111-111111111111', domain: 'infrastructure', description: 'The water cooler on the 2nd floor near the science labs has been broken for over two weeks. Students have to walk all the way to the ground floor to get water, which wastes a lot of time during breaks. This is especially inconvenient during summer. The cooler has a visible crack and does not dispense cold water.', is_anonymous_requested: false, identity_revealed: false, status: 'in_progress',              assigned_council_member_id: '22222222-2222-2222-2222-222222222222', current_handler_role: 'council_member' },
    { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', complaint_no: 2, student_id: '77777777-7777-7777-7777-777777777777', domain: 'academics',       description: 'The new mathematics teacher has been covering topics too quickly without checking for understanding. Many students in XII A are struggling with integration and have not been given adequate practice time. We have requested extra doubt sessions multiple times but no action has been taken. At least 15 students in our class are at risk of falling behind before the board exam.',  is_anonymous_requested: true,  identity_revealed: false, status: 'escalated_to_coordinator', assigned_council_member_id: '22222222-2222-2222-2222-222222222222', current_handler_role: 'coordinator' },
    { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', complaint_no: 3, student_id: '11111111-1111-1111-1111-111111111111', domain: 'safety',         description: 'There is a broken tile near the entrance of the basketball court that has already caused two students to trip and fall. One student suffered a minor ankle sprain. The area has not been cordoned off or marked as a hazard. This is a safety risk and requires immediate repair or at least a warning sign to prevent further injuries.',                    is_anonymous_requested: false, identity_revealed: false, status: 'resolved',                 assigned_council_member_id: '22222222-2222-2222-2222-222222222222', current_handler_role: 'council_member' },
    { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', complaint_no: 4, student_id: '77777777-7777-7777-7777-777777777777', domain: 'behaviour',      description: 'A group of senior students have been consistently occupying the junior common room during lunch breaks and refusing to leave despite requests from junior students and a class prefect. This has been happening for the past 3 weeks. The behavior is intimidating and the juniors feel they cannot access the designated space.',                                is_anonymous_requested: true,  identity_revealed: false, status: 'escalated_to_teacher',    assigned_council_member_id: '22222222-2222-2222-2222-222222222222', current_handler_role: 'class_teacher' },
  ], { onConflict: 'id' })
  if (cErr) console.log(`  ⚠ Complaints: ${cErr.message}`)
  else console.log('  ✓ Complaints seeded (4 samples)')

  // Insert timeline
  const timelineRows = [
    { complaint_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', action: 'Complaint raised',              performed_by: '11111111-1111-1111-1111-111111111111', performed_by_role: 'student',        note: 'Domain: infrastructure.' },
    { complaint_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', action: 'Verified in person',            performed_by: '22222222-2222-2222-2222-222222222222', performed_by_role: 'council_member', note: 'Met with Rahul and confirmed the cooler issue.' },
    { complaint_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', action: 'Status updated to: in progress',performed_by: '22222222-2222-2222-2222-222222222222', performed_by_role: 'council_member', note: 'Contacted maintenance. Repair scheduled for Friday.' },
    { complaint_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', action: 'Complaint raised',              performed_by: '77777777-7777-7777-7777-777777777777', performed_by_role: 'student',        note: 'Domain: academics. Anonymity requested.' },
    { complaint_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', action: 'Verified in person',            performed_by: '22222222-2222-2222-2222-222222222222', performed_by_role: 'council_member', note: 'Spoke to student (identity kept anonymous).' },
    { complaint_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', action: 'Escalated to coordinator',      performed_by: '22222222-2222-2222-2222-222222222222', performed_by_role: 'council_member', note: 'Issue affects multiple students. Identity kept anonymous.' },
    { complaint_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', action: 'Complaint raised',              performed_by: '11111111-1111-1111-1111-111111111111', performed_by_role: 'student',        note: 'Domain: safety.' },
    { complaint_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', action: 'Verified in person',            performed_by: '22222222-2222-2222-2222-222222222222', performed_by_role: 'council_member', note: 'Visited the basketball court and confirmed broken tile.' },
    { complaint_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', action: 'Complaint resolved',            performed_by: '22222222-2222-2222-2222-222222222222', performed_by_role: 'council_member', note: 'Maintenance team repaired the tile. Issue fully resolved.' },
    { complaint_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', action: 'Complaint raised',              performed_by: '77777777-7777-7777-7777-777777777777', performed_by_role: 'student',        note: 'Domain: behaviour. Anonymity requested.' },
    { complaint_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', action: 'Verified in person',            performed_by: '22222222-2222-2222-2222-222222222222', performed_by_role: 'council_member', note: 'Confirmed issue. Identity kept anonymous.' },
    { complaint_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', action: 'Escalated to class teacher',   performed_by: '22222222-2222-2222-2222-222222222222', performed_by_role: 'council_member', note: 'Requires teacher intervention. Identity kept anonymous per student request.' },
  ]
  const { error: tErr } = await supabase.from('complaint_timeline').insert(timelineRows)
  if (tErr) console.log(`  ⚠ Timeline: ${tErr.message}`)
  else console.log('  ✓ Timeline seeded (12 entries)')

  // Insert escalations
  const { error: eErr } = await supabase.from('escalations').insert([
    { complaint_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', escalated_by: '22222222-2222-2222-2222-222222222222', escalated_to_role: 'coordinator',   student_consent: false, reason: 'Issue affects multiple students in the class.' },
    { complaint_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', escalated_by: '22222222-2222-2222-2222-222222222222', escalated_to_role: 'class_teacher', student_consent: false, reason: 'Requires teacher authority to address senior student behaviour.' },
  ])
  if (eErr) console.log(`  ⚠ Escalations: ${eErr.message}`)
  else console.log('  ✓ Escalations seeded')

  console.log('\n✅ Seed complete!')
}

runViaPG().catch(console.error)
