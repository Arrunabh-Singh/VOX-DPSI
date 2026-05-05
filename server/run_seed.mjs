/**
 * Vox DPSI — Seed Runner
 * Inserts all demo data into Supabase via REST API (no SQL editor needed)
 * Run: node server/run_seed.mjs  (from vox-dpsi folder)
 */

const SUPABASE_URL = 'https://gznhziptmydkalsrazpj.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bmh6aXB0bXlka2Fsc3JhenBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ5MDQzMSwiZXhwIjoyMDkyMDY2NDMxfQ.2kIsWAyCy2qPV0cRO5smxY_Ve4yyFSK5Y-wjkjOrQHo'

const H = {
  'apikey':        SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=minimal'
}

async function req(method, path, body) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`
  const res = await fetch(url, { method, headers: H, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  }
  return res
}

async function del(table) {
  // PostgREST requires at least one filter for DELETE — use a catch-all
  await req('DELETE', `${table}?id=neq.00000000-0000-0000-0000-000000000000`)
  console.log(`  ✓ Cleared ${table}`)
}

// ── 1. Clear tables (FK order: child → parent) ───────────────────────────────
console.log('\n[1/5] Clearing existing seed data...')
await del('escalations')
await del('complaint_timeline')
await del('complaints')
await del('users')

// ── 2. Insert users ───────────────────────────────────────────────────────────
console.log('\n[2/5] Inserting users...')
const HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6'

await req('POST', 'users', [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Rahul Sharma',         email: '5001@student.dpsindore.org',  password_hash: HASH, role: 'student',        scholar_no: '5001', section: 'XII B', house: 'Prithvi' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Priya Verma',          email: '5002@student.dpsindore.org',  password_hash: HASH, role: 'council_member', scholar_no: '5002', section: 'XII A', house: 'Agni'    },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Mrs. Sharma',          email: 'sharma@staff.dpsindore.org',  password_hash: HASH, role: 'class_teacher',  scholar_no: null,   section: 'XII B', house: null      },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Mr. Kapil Sir',        email: 'kapil@staff.dpsindore.org',   password_hash: HASH, role: 'coordinator',    scholar_no: null,   section: null,    house: null      },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Mr. Parminder Chopra', email: 'principal@dpsindore.org',     password_hash: HASH, role: 'principal',      scholar_no: null,   section: null,    house: null      },
  { id: '66666666-6666-6666-6666-666666666666', name: 'Arrunabh Singh',       email: '5411@student.dpsindore.org',  password_hash: HASH, role: 'supervisor',     scholar_no: '5411', section: 'XII B', house: 'Prithvi' },
  { id: '77777777-7777-7777-7777-777777777777', name: 'Aisha Khan',           email: 'aisha@student.dpsindore.org', password_hash: HASH, role: 'student',        scholar_no: '5003', section: 'XII A', house: 'Agni'    },
])
console.log('  ✓ 7 users inserted')

// ── 3. Insert complaints ──────────────────────────────────────────────────────
console.log('\n[3/5] Inserting sample complaints...')
await req('POST', 'complaints', [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', complaint_no: 1,
    student_id: '11111111-1111-1111-1111-111111111111', domain: 'infrastructure',
    description: 'The water cooler on the 2nd floor near the science labs has been broken for over two weeks. Students have to walk all the way to the ground floor to get water, which wastes a lot of time during breaks. This is especially inconvenient during summer. The cooler has a visible crack and does not dispense cold water.',
    is_anonymous_requested: false, status: 'in_progress',
    assigned_council_member_id: '22222222-2222-2222-2222-222222222222', current_handler_role: 'council_member'
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', complaint_no: 2,
    student_id: '77777777-7777-7777-7777-777777777777', domain: 'academics',
    description: 'The new mathematics teacher has been covering topics too quickly without checking for understanding. Many students in XII A are struggling with integration and have not been given adequate practice time. We have requested extra doubt sessions multiple times but no action has been taken. At least 15 students in our class are at risk of falling behind before the board exam.',
    is_anonymous_requested: true, status: 'escalated_to_coordinator',
    assigned_council_member_id: '22222222-2222-2222-2222-222222222222', current_handler_role: 'coordinator'
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', complaint_no: 3,
    student_id: '11111111-1111-1111-1111-111111111111', domain: 'safety',
    description: 'There is a broken tile near the entrance of the basketball court that has already caused two students to trip and fall. One student suffered a minor ankle sprain. The area has not been cordoned off or marked as a hazard. This is a safety risk and requires immediate repair or at least a warning sign to prevent further injuries.',
    is_anonymous_requested: false, status: 'resolved',
    assigned_council_member_id: '22222222-2222-2222-2222-222222222222', current_handler_role: 'council_member'
  },
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', complaint_no: 4,
    student_id: '77777777-7777-7777-7777-777777777777', domain: 'behaviour',
    description: 'A group of senior students have been consistently occupying the junior common room during lunch breaks and refusing to leave despite requests from junior students and a class prefect. This has been happening for the past 3 weeks. The behavior is intimidating and the juniors feel they cannot access the designated space.',
    is_anonymous_requested: true, status: 'escalated_to_teacher',
    assigned_council_member_id: '22222222-2222-2222-2222-222222222222', current_handler_role: 'class_teacher'
  },
])
console.log('  ✓ 4 sample complaints inserted')

// ── 4. Insert timeline ────────────────────────────────────────────────────────
console.log('\n[4/5] Inserting timeline entries...')
await req('POST', 'complaint_timeline', [
  { complaint_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', action: 'Complaint raised',              performed_by: '11111111-1111-1111-1111-111111111111', performed_by_role: 'student',        note: 'Domain: infrastructure.' },
  { complaint_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', action: 'Verified in person',            performed_by: '22222222-2222-2222-2222-222222222222', performed_by_role: 'council_member', note: 'Met with Rahul and confirmed the cooler issue.' },
  { complaint_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', action: 'Status updated to: in progress',performed_by: '22222222-2222-2222-2222-222222222222', performed_by_role: 'council_member', note: 'Contacted maintenance. Repair scheduled for Friday.' },

  { complaint_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', action: 'Complaint raised',              performed_by: '77777777-7777-7777-7777-777777777777', performed_by_role: 'student',        note: 'Domain: academics. Anonymity requested.' },
  { complaint_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', action: 'Verified in person',            performed_by: '22222222-2222-2222-2222-222222222222', performed_by_role: 'council_member', note: 'Spoke to student (identity kept anonymous).' },
  { complaint_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', action: 'Escalated to coordinator',      performed_by: '22222222-2222-2222-2222-222222222222', performed_by_role: 'council_member', note: 'Issue affects multiple students. Student identity kept anonymous for next handler.' },

  { complaint_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', action: 'Complaint raised',              performed_by: '11111111-1111-1111-1111-111111111111', performed_by_role: 'student',        note: 'Domain: safety.' },
  { complaint_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', action: 'Verified in person',            performed_by: '22222222-2222-2222-2222-222222222222', performed_by_role: 'council_member', note: 'Visited the basketball court and confirmed broken tile.' },
  { complaint_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', action: 'Complaint resolved',            performed_by: '22222222-2222-2222-2222-222222222222', performed_by_role: 'council_member', note: 'Maintenance team repaired the tile. Issue fully resolved.' },

  { complaint_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', action: 'Complaint raised',              performed_by: '77777777-7777-7777-7777-777777777777', performed_by_role: 'student',        note: 'Domain: behaviour. Anonymity requested.' },
  { complaint_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', action: 'Verified in person',            performed_by: '22222222-2222-2222-2222-222222222222', performed_by_role: 'council_member', note: 'Confirmed issue. Identity kept anonymous.' },
  { complaint_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', action: 'Escalated to class teacher',    performed_by: '22222222-2222-2222-2222-222222222222', performed_by_role: 'council_member', note: 'Requires teacher intervention. Student identity kept anonymous per their request.' },
])
console.log('  ✓ 12 timeline entries inserted')

// ── 5. Insert escalations ─────────────────────────────────────────────────────
console.log('\n[5/5] Inserting escalation records...')
await req('POST', 'escalations', [
  { complaint_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', escalated_by: '22222222-2222-2222-2222-222222222222', escalated_to_role: 'coordinator',   student_consent: false, reason: 'Issue affects multiple students in the class.' },
  { complaint_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', escalated_by: '22222222-2222-2222-2222-222222222222', escalated_to_role: 'class_teacher', student_consent: false, reason: 'Requires teacher authority to address senior student behaviour.' },
])
console.log('  ✓ 2 escalation records inserted')

console.log('\n============================================')
console.log('  ✅  Seed complete! Database is ready.')
console.log('============================================\n')
