/**
 * Vox DPSI — Schema Patch
 * Adds identity_revealed column to complaints if missing, then reloads PostgREST cache.
 */

const SUPABASE_URL = 'https://gznhziptmydkalsrazpj.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bmh6aXB0bXlka2Fsc3JhenBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ5MDQzMSwiZXhwIjoyMDkyMDY2NDMxfQ.2kIsWAyCy2qPV0cRO5smxY_Ve4yyFSK5Y-wjkjOrQHo'

// ── Try Supabase pg-meta endpoint (internal, sometimes exposed) ───────────────
async function tryPgMeta(sql) {
  try {
    const res = await fetch(`${SUPABASE_URL}/pg-meta/v0/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    })
    if (res.ok) return { ok: true, via: 'pg-meta' }
    return { ok: false, status: res.status, text: await res.text() }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// ── Try Supabase Management API (requires personal access token) ───────────────
// async function tryManagementAPI(sql) { ... }

const SQL_ADD_COL = `
  ALTER TABLE complaints
    ADD COLUMN IF NOT EXISTS identity_revealed BOOLEAN DEFAULT false;
`
const SQL_RELOAD = `SELECT pg_notify('pgrst', 'reload schema');`

console.log('\n[Schema Patch] Adding identity_revealed column...')
const r1 = await tryPgMeta(SQL_ADD_COL)
if (r1.ok) {
  console.log('  ✓ Column added via pg-meta')
  const r2 = await tryPgMeta(SQL_RELOAD)
  if (r2.ok) console.log('  ✓ PostgREST schema cache reloaded')
} else {
  console.log(`  ✗ pg-meta not accessible (${r1.status || r1.error})`)
  console.log('\n  ⚠  Manual step needed: run this SQL in Supabase dashboard:')
  console.log('  https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql')
  console.log('\n  ALTER TABLE complaints')
  console.log('    ADD COLUMN IF NOT EXISTS identity_revealed BOOLEAN DEFAULT false;')
  console.log('\n  SELECT pg_notify(\'pgrst\', \'reload schema\');')
  console.log()
}
