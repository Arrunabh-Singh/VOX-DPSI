# Vox DPSI — Pre-Launch Security & Code Review
**Reviewed:** 2026-05-14 | **Reviewer:** Claude Sonnet 4.6 | **Scope:** All server + key client files

---

## Executive Summary — Top 10 Issues by Severity

| # | Severity | Issue | File | Line |
|---|----------|-------|------|------|
| 1 | 🔴 CRITICAL | Unauthenticated `/api/test-whatsapp` endpoint | server/index.js | 117 |
| 2 | 🔴 CRITICAL | BOLA/IDOR: council_member can change status/resolve/escalate ANY complaint | server/routes/complaints.js | 574, 618, 680 |
| 3 | 🔴 CRITICAL | Timeline has no complaint-level access control — any user can read any timeline | server/routes/timeline.js | 8 |
| 4 | 🔴 CRITICAL | `schema.sql` missing `notifications` table CREATE — indexes reference it but it doesn't exist | schema.sql | 125 |
| 5 | 🔴 CRITICAL | `complaints` status CHECK constraint missing 8 statuses used by the code | schema.sql | 38 |
| 6 | 🔥 HIGH | `allowRoles(STAFF_ROLES)` called with array, not spread — internal notes inaccessible to EVERYONE | server/routes/notes.js | 11, 27 |
| 7 | 🔥 HIGH | `submitted_at` column doesn't exist in `complaint_feedback` table — CSAT feedback broken | server/routes/complaints.js | 1680 |
| 8 | 🔥 HIGH | JWT token returned in response body in all environments | server/routes/auth.js | 110, 246 |
| 9 | 🟡 MEDIUM | Merge-candidates response leaks student identity for anonymous complaints | server/routes/complaints.js | 1948 |
| 10 | 🟡 MEDIUM | Audit log fetches up to 15,000 rows into memory — O(n) memory + latency | server/routes/auditLog.js | 57, 90 |

---

## Phase 1: Security Audit

### S-01 🔴 CRITICAL — Unauthenticated Test Endpoint
**File:** `server/index.js:117-127`

```js
app.get('/api/test-whatsapp', async (req, res) => {
  // No verifyToken, no allowRoles
  await notifyAdminAlert(adminWA, 'Test message from Vox DPSI')
```

Any unauthenticated request can trigger a real WhatsApp message to the admin number. On a public school system, this is an abuse vector (spam/rate exhaustion of Twilio quota).

**Fix:**
```js
app.get('/api/test-whatsapp', verifyToken, allowRoles('principal', 'vice_principal'), async (req, res) => {
```

---

### S-02 🔴 CRITICAL — BOLA/IDOR on Status-Changing Endpoints
**File:** `server/routes/complaints.js:574, 618, 680`

Three endpoints check only the user's **role**, not whether they are the **assigned handler** for the specific complaint:

- `PATCH /:id/status` — any `council_member` can set status on any complaint
- `PATCH /:id/resolve` — any `council_member` can resolve any complaint  
- `PATCH /:id/escalate` — any `council_member` can escalate any complaint

Council Member A can resolve or escalate Council Member B's complaint, creating chaos in the audit trail and potentially burying POSH/POCSO complaints.

**Fix for `/status` and `/resolve`:** Add ownership check before the update:
```js
// After fetching complaint, before the update:
if (role === 'council_member') {
  const { data: check } = await supabase
    .from('complaints').select('assigned_council_member_id').eq('id', id).single()
  if (check?.assigned_council_member_id !== userId) {
    return res.status(403).json({ error: 'Not assigned to you' })
  }
}
```

**Fix for `/escalate`:** Same pattern. Council member can only escalate their own assigned complaint.

---

### S-03 🔴 CRITICAL — Timeline Has No Access Control
**File:** `server/routes/timeline.js:8-25`

The timeline endpoint only requires `verifyToken`. It does NOT check if the requesting user is authorized to view that complaint. A student can call:
```
GET /api/complaints/<any-complaint-id>/timeline
```
and see the full internal discussion, including council member notes, escalation reasons, and POSH/POCSO details for other students' complaints.

**Fix:**
```js
router.get('/', verifyToken, async (req, res) => {
  const { id } = req.params
  const { role, id: userId } = req.user

  // Verify the user has access to this complaint first
  const { data: complaint } = await supabase
    .from('complaints').select('student_id, assigned_council_member_id').eq('id', id).single()
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' })
  
  const HIGH_ROLES = ['supervisor', 'principal', 'vice_principal', 'coordinator', 'class_teacher', 'director', 'board_member']
  if (role === 'student' && complaint.student_id !== userId) {
    return res.status(403).json({ error: 'Access denied' })
  }
  if (role === 'council_member' && complaint.assigned_council_member_id !== userId) {
    return res.status(403).json({ error: 'Access denied' })
  }
  // ... rest of handler
```

---

### S-04 🔴 CRITICAL — `notifications` Table Missing from schema.sql
**File:** `schema.sql:125-126`

```sql
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
```

The `notifications` table is referenced in index creation and heavily used by the entire notification system, but `CREATE TABLE notifications` is **missing from `schema.sql`**. On a fresh Supabase setup, running `schema.sql` will fail or leave a broken state.

The `notifications` table must exist with at minimum: `id, user_id, title, body, type, complaint_id, is_read, created_at`.

---

### S-05 🔴 CRITICAL — `complaints.status` CHECK Constraint Missing 8 Statuses
**File:** `schema.sql:38-42`

The schema defines:
```sql
status TEXT DEFAULT 'raised' CHECK (status IN (
  'raised','verified','in_progress',
  'escalated_to_teacher','escalated_to_coordinator','escalated_to_principal',
  'resolved','closed'
))
```

But the application code uses these additional statuses that would fail the constraint:
- `'merged'` — complaint merging (complaints.js:1860)
- `'withdrawn'` — student withdrawal, referenced in SLA queries
- `'archived'` — data retention cron (autoEscalate.js:357)
- `'appealed'` — appeal filing (complaints.js:1031)
- `'requires_ic'` — POSH/POCSO routing (complaints.js:145)
- `'draft'` — referenced in schema column `draft_data`
- `'hidden'` / `is_hidden=true` — soft-delete approval uses `status='closed'` + flag (OK)

Every attempt to update status to one of these values would throw a Supabase constraint error, silently returning an error to the user (the code catches and returns 500s).

**Fix:** Run this migration:
```sql
ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_status_check;
ALTER TABLE complaints ADD CONSTRAINT complaints_status_check CHECK (status IN (
  'raised','verified','in_progress',
  'escalated_to_teacher','escalated_to_coordinator','escalated_to_principal',
  'resolved','closed','merged','withdrawn','archived','appealed','requires_ic','draft'
));
```

---

### S-06 🟡 MEDIUM — No CSRF Protection (Mitigated but Incomplete)
**File:** `server/routes/auth.js:44-50`, `server/index.js:77-80`

In production, cookies use `sameSite: 'none'` (required for cross-site Railway→Vercel). There is no CSRF token, no Origin/Referer header check. The practical risk is mitigated because:
- CORS is restricted to a single origin → cross-origin XHR blocked
- All API endpoints require `Content-Type: application/json` → simple form POSTs don't parse

However, a well-crafted `fetch()` from a malicious page with CORS preflight bypass (e.g. `text/plain` encoded JSON) could still pose risk.

**Recommended fix:** Add an Origin check on state-changing routes:
```js
app.use((req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin
    const allowed = process.env.CLIENT_URL || 'http://localhost:5173'
    if (origin && origin !== allowed) {
      return res.status(403).json({ error: 'Forbidden' })
    }
  }
  next()
})
```

---

### S-07 🟡 MEDIUM — JWT Token Exposed in Response Body
**File:** `server/routes/auth.js:110, 246`

```js
res.status(201).json({ token, user }) // line 110 — register
res.json({ token, user: u })           // line 246 — verify-login-otp
```

The JWT token is already set as an HttpOnly cookie. Returning it in the JSON body (commented "for dev tooling") means if any XSS vector exists, the token can be stolen. This should be removed in production.

**Fix:**
```js
// On register:
res.status(201).json({ user })  // remove token from body
// On verify-login-otp:
res.json({ user: u })           // remove token from body
```

---

### S-08 🟡 MEDIUM — VPC HTML Response Uses Unescaped User Data
**File:** `server/routes/auth.js:516, 538, 543`

```js
return res.send(vpcPage('Already Consented', `Consent for ${user.name} has already been recorded.`, true))
```

`user.name` is rendered directly in HTML without escaping. A name like `<img src=x onerror=alert(1)>` could execute in a parent's browser. The `sanitizeBody` middleware strips `<script>` tags but may not catch all HTML injection vectors.

**Fix:** Add an HTML escape helper:
```js
const escHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
// Then:
return res.send(vpcPage('Already Consented', `Consent for ${escHtml(user.name)} has already been recorded.`, true))
```

---

### S-09 🟡 MEDIUM — `Math.random()` Used for VPC OTP in Dev Mode
**File:** `server/routes/auth.js:595`

```js
otp = Math.floor(100000 + Math.random() * 900000).toString()
```

The login OTP correctly uses `crypto.randomInt()` (line 27), but the VPC OTP falls back to `Math.random()`. `Math.random()` is not cryptographically secure. Even in dev mode, cryptographically weak tokens should be avoided.

**Fix:**
```js
const { randomInt } = await import('crypto')
otp = randomInt(100000, 1000000).toString()
```

---

### S-10 🟡 MEDIUM — File Upload Size Limit Mismatch
**File:** `server/routes/upload.js:43`, `server/index.js:82`

The upload multer limit is 10MB but CLAUDE.md says max 5MB. Also, `express.json({ limit: '10mb' })` is very generous for a grievance platform — someone could submit a complaint description with 9.9MB of text.

**Fix:** 
- Reduce upload limit to 5MB: `limits: { fileSize: 5 * 1024 * 1024 }`
- Add max description length validation in complaints POST:
  ```js
  if (description.length > 5000) return res.status(400).json({ error: 'Description too long (max 5000 characters)' })
  ```

---

## Phase 2: Bug Hunt

### B-01 🔥 HIGH — `allowRoles` Called Incorrectly in notes.js
**File:** `server/routes/notes.js:11, 27`

```js
const STAFF_ROLES = ['council_member', 'class_teacher', 'coordinator', 'principal', 'supervisor']
router.get('/', verifyToken, allowRoles(STAFF_ROLES), ...)  // BUG: passes array as single arg
router.post('/', verifyToken, allowRoles(STAFF_ROLES), ...) // same bug
```

`allowRoles` signature is `function allowRoles(...roles)`. When called as `allowRoles(STAFF_ROLES)`:
- `roles` inside the function = `[['council_member', 'class_teacher', ...]]`
- `roles.includes('council_member')` → **always false** (searching array containing a nested array)
- Result: **every user gets 403 "Access forbidden"** — internal notes are completely broken

**Fix:**
```js
router.get('/', verifyToken, allowRoles(...STAFF_ROLES), ...)
router.post('/', verifyToken, allowRoles(...STAFF_ROLES), ...)
```

---

### B-02 🔥 HIGH — `submitted_at` Column Doesn't Exist in `complaint_feedback`
**File:** `server/routes/complaints.js:1676-1683`, `migration_erasure_feedback.sql:52-59`

The `complaint_feedback` table has columns: `id, complaint_id, student_id, rating, comment, created_at, UNIQUE(complaint_id, student_id)`.

The insert at line 1676 includes `submitted_at: new Date().toISOString()`. This column does not exist. Every CSAT feedback submission will fail with a Supabase schema error.

**Fix:** Remove `submitted_at` from the insert:
```js
const { data, error } = await supabase
  .from('complaint_feedback')
  .upsert({
    complaint_id: id,
    student_id: req.user.id,
    rating: parseInt(rating, 10),
    comment: comment?.slice(0, 500) || null,
    // Remove: submitted_at: new Date().toISOString(),
  }, { onConflict: 'complaint_id' })
```

---

### B-03 🔥 HIGH — Duplicate `PATCH /:id/feedback` Route Shadowed by Later `POST /:id/feedback`
**File:** `server/routes/complaints.js:955, 1647`

There are two feedback endpoints:
- `PATCH /:id/feedback` (line 955) — stores to `complaints.feedback_rating` column
- `POST /:id/feedback` (line 1647) — stores to separate `complaint_feedback` table

Both accept `rating + comment/note`. They use different storage. The PATCH route is registered first and hits the same `:id` pattern. Depending on which the client calls, behavior is inconsistent. The PATCH version has an `if (complaint.feedback_rating)` guard that prevents re-submission (line 977) but the POST version uses `upsert` and allows updates.

**Fix:** Remove the PATCH `/:id/feedback` route (lines 955-992) and standardize on the POST `/:id/feedback` route with the `complaint_feedback` table. Also remove the `feedback_rating`, `feedback_note`, `feedback_at` columns from complaints table if migrating.

---

### B-04 🟡 MEDIUM — Complaint Status Lifecycle Missing `'in_progress'` Transition Guard
**File:** `server/routes/complaints.js:574-615`

A complaint in status `'requires_ic'` (POSH/POCSO) can still be moved to `'in_progress'` by a coordinator because the allowed status list for coordinators includes `'in_progress'`. POSH/POCSO complaints should require IC committee involvement and should not be silently moved to `in_progress`.

```js
// Missing guard:
if (complaint.is_posh_pocso && status === 'in_progress' && !['coordinator','principal'].includes(role)) {
  return res.status(403).json({ error: 'POSH/POCSO complaints require coordinator or principal action' })
}
```

---

### B-05 🟡 MEDIUM — Reopen Doesn't Reset `is_auto_escalated` Flag
**File:** `server/routes/complaints.js:916-924`

When a student reopens a complaint, `is_auto_escalated` remains `true`. The autoEscalate cron filters with `.is('is_auto_escalated', false)`, so a reopened-then-stale complaint will never be auto-escalated again. 

**Fix:** Reset the flag on reopen:
```js
const { data, error } = await supabase
  .from('complaints')
  .update({
    status: 'in_progress',
    is_auto_escalated: false,   // allow future auto-escalation
    updated_at: new Date().toISOString(),
  })
  .eq('id', id)
```

---

### B-06 🟡 MEDIUM — Merge-Candidates Response Leaks Student Identity
**File:** `server/routes/complaints.js:1942-1951`

```js
res.json(filtered.map(c => ({
  ...
  student_name: c.student?.name,  // Leaked! No anonymity check
  student_section: c.student?.section,
})))
```

When a coordinator looks up merge candidates, the response includes the student name even for anonymous complaints. The list and detail endpoints both mask identity for anonymous complaints, but this endpoint does not.

**Fix:**
```js
student_name: (c.is_anonymous_requested && !c.identity_revealed) ? 'Anonymous Student' : c.student?.name,
```

---

### B-07 🟡 MEDIUM — Consensus Vote Has a Race Condition on Quorum Check
**File:** `server/routes/complaints.js:2115-2170`

The vote is upserted (line 2116), then all votes are re-fetched (line 2128), then the complaint is updated to `resolved` (line 2149). If two simultaneous votes both reach quorum simultaneously, both could trigger the resolve update. The second update is idempotent (already resolved), but two timeline entries would be inserted.

There's no database-level lock. For a school system with few simultaneous users this is low probability, but for correctness a upsert-then-check pattern with optimistic locking or a DB function would be ideal.

---

### B-08 🟡 MEDIUM — Email URL in Status Email Contains Complaint Number, Not UUID
**File:** `server/services/email.js:196`

```js
<a href="${clientBase}/complaints/${complaintNo}">View My Complaint →</a>
```

`complaintNo` is the formatted display string (`VOX-0001`), not the UUID. The React router expects a UUID at `/complaints/:id`. This link would navigate to a 404.

**Fix:** Pass `complaintId` (the UUID) to `sendStatusChangeEmail` and use it in the link:
```js
// In email.js signature:
export async function sendStatusChangeEmail(studentEmail, studentName, complaintNo, newStatus, note = null, complaintId = null)
// In href:
href="${clientBase}/complaints/${complaintId || complaintNo}"
```

---

### B-09 🟢 LOW — `vpc-otp-verify` Sets `vpc_status: 'approved'` Instead of `'granted'`
**File:** `server/routes/auth.js:661-666`

The email-based VPC flow sets `vpc_status: 'granted'`, but the OTP-based VPC flow sets `vpc_status: 'approved'`. The client and `VpcGate.jsx` check for `vpc_status === 'granted'` (per CLAUDE.md). If the OTP path is used, the VPC gate will never open.

**Fix:** Change line 662 to `'granted'`:
```js
await supabase.from('users').update({ vpc_status: 'granted' }).eq('id', req.user.id)
```

---

### B-10 🟢 LOW — Auto-Escalation Idempotency Guard Too Broad
**File:** `server/jobs/autoEscalate.js:52-63`

The guard skips escalation if ANY system timeline entry exists in the last 2 hours — not just escalation entries. SLA alerts and follow-up reminders also create system entries. This means a complaint that received an SLA alert 1.5 hours ago won't be auto-escalated even if the 72-hour window just expired.

**Fix:** Narrow the check:
```js
.like('action', '%Auto-escalated%')  // instead of checking all system entries
```

---

## Phase 3: Code Quality

### Q-01 🟡 MEDIUM — Audit Log Fetches Up to 15,000 Rows in Memory
**File:** `server/routes/auditLog.js:57, 90, 125`

```js
const { data, error } = await q.range(0, 9999)  // timeline: up to 10,000 rows
const { data, error } = await q.range(0, 4999)  // access log: up to 5,000 rows
const { data, error } = await q.range(0, 999)   // erasure: up to 1,000 rows
```

All 15,000 rows are loaded into memory, merged, sorted in-process, then paginated. As the system accumulates data, this will:
1. Cause memory spikes
2. Add latency to every audit log page load

**Fix:** Push sorting and pagination to the database per event type, or implement a unified `audit_log` table (already in CLAUDE.md task list) and paginate at DB level.

---

### Q-02 🟡 MEDIUM — Guardian `/my-children` Logic Duplicated
**File:** `server/routes/guardian.js:13-64, 67-101`

The child-lookup logic (primary `guardian_student_id` + legacy `vpc_parent_email` fallback) is copy-pasted verbatim in both `GET /my-children` and `GET /complaints`. Extract to a helper:

```js
async function getGuardianChildIds(guardianId, guardianEmail) {
  const { data: userRec } = await supabase.from('users').select('guardian_student_id').eq('id', guardianId).single()
  const childIds = userRec?.guardian_student_id ? [userRec.guardian_student_id] : []
  const { data: legacy } = await supabase.from('users').select('id').eq('vpc_parent_email', guardianEmail)
  return [...new Set([...childIds, ...(legacy || []).map(c => c.id)])]
}
```

---

### Q-03 🟢 LOW — `migration_skills_assignment.sql` Not Idempotent
**File:** `migration_skills_assignment.sql:6`

```sql
ALTER TABLE users ADD COLUMN domain_expertise TEXT[];
```

Missing `IF NOT EXISTS` — running this migration twice will throw `ERROR: column "domain_expertise" of relation "users" already exists`.

**Fix:**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS domain_expertise TEXT[];
```

---

### Q-04 🟢 LOW — Developer Email Hardcoded as Fallback
**File:** `server/services/email.js:18`

```js
const OVERRIDE_TO = process.env.RESEND_OVERRIDE_TO || 'arrunabh.s@gmail.com'
```

If `RESEND_OVERRIDE_TO` is not set in production, all real student emails (consent links, OTPs, status updates) silently redirect to the developer's personal email instead of failing loudly.

**Fix:** Remove the fallback:
```js
const OVERRIDE_TO = process.env.RESEND_OVERRIDE_TO
if (USE_RESEND && !OVERRIDE_TO) throw new Error('RESEND_OVERRIDE_TO must be set in production')
```

---

### Q-05 🟢 LOW — Description Length Unbound in Complaints
**File:** `server/routes/complaints.js:81-83`

```js
if (description.length < 50) {
  return res.status(400).json({ error: 'Description must be at least 50 characters' })
}
// No maximum length check
```

A student could submit a 10MB description. Add:
```js
if (description.length > 5000) {
  return res.status(400).json({ error: 'Description must be under 5000 characters' })
}
```

---

### Q-06 🟢 LOW — `complaintNo.js` Padding Inconsistency
**File:** `server/routes/complaints.js:1069-1071, 1108-1110`

In the appeals section, complaint numbers are padded to 3 digits (`VOX-001`) instead of 4:
```js
complaint_no_display: a.complaint.complaint_no ? `VOX-${String(a.complaint.complaint_no).padStart(3, '0')}` : null
```
But `formatComplaintNo` pads to 4. This creates `VOX-001` vs `VOX-0001` inconsistency.

**Fix:** Use `formatComplaintNo(a.complaint.complaint_no)` consistently.

---

### Q-07 🟢 LOW — AuthContext Caches Token Validity for 5 Minutes
**File:** `client/src/context/AuthContext.jsx:21-34`

If a user's role changes (e.g., council member is removed) or their account is suspended, the frontend won't reflect this for up to 5 minutes because it trusts localStorage cache. For a grievance platform with sensitive POSH/POCSO data, this window should be shorter (1 minute) or the background revalidation should happen on every route change.

---

## Phase 4: Database Migration Status

### Migration Readiness Assessment

| Migration File | Safe to Run | Issues |
|----------------|-------------|--------|
| `migration_delegation.sql` | ✅ Safe | All `IF NOT EXISTS`, proper RLS |
| `migration_consensus.sql` | ✅ Safe | `IF NOT EXISTS` on tables/indexes, `ADD COLUMN IF NOT EXISTS` |
| `migration_term_limits.sql` | ✅ Safe | `ADD COLUMN IF NOT EXISTS`, conditional index |
| `migration_guardian_role.sql` | ✅ Safe | `DROP CONSTRAINT IF EXISTS` + re-add |
| `migration_erasure_feedback.sql` | ✅ Safe | `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` |
| `migration_system_config.sql` | ✅ Safe | `IF NOT EXISTS`, `ON CONFLICT DO NOTHING` |
| `migration_phone_fields.sql` | ✅ Safe | `ADD COLUMN IF NOT EXISTS` |
| `migration_skills_assignment.sql` | ⚠️ Unsafe | Missing `IF NOT EXISTS` — will fail on re-run |

### Missing Tables — Run These Before Migrations

The following tables are referenced in code but have **no CREATE TABLE in any migration or schema.sql**:

| Table | Used In | Action Required |
|-------|---------|-----------------|
| `notifications` | notifications.js, services/notifications.js, schema.sql indexes | Create table manually — schema.sql has indexes for it but no CREATE TABLE |
| `complaint_access_log` | complaints.js:514, auditLog.js | Create table manually |
| `internal_notes` | routes/notes.js | Create table manually |
| `appeals` | complaints.js:1021 | Create table manually |
| `complaint_deletions` | complaints.js:1390 | Create table manually |
| `safe_dialogues` | routes/safeDialogue.js | Create table manually |
| `workflow_templates` | routes/workflowTemplates.js | Verify in schema or create |
| `resolution_templates` | routes/resolutionTemplates.js | Verify in schema or create |

### Required Table DDL (Minimum)

```sql
-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  body         TEXT,
  type         TEXT DEFAULT 'status_update',
  complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
  is_read      BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- complaint_access_log
CREATE TABLE IF NOT EXISTS complaint_access_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id        UUID REFERENCES complaints(id) ON DELETE CASCADE,
  accessed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  accessed_by_role    TEXT,
  is_assigned_handler BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE complaint_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON complaint_access_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- internal_notes
CREATE TABLE IF NOT EXISTS internal_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  author_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  note         TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON internal_notes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- appeals
CREATE TABLE IF NOT EXISTS appeals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id          UUID REFERENCES complaints(id) ON DELETE CASCADE,
  filed_by              UUID REFERENCES users(id) ON DELETE SET NULL,
  reason                TEXT NOT NULL,
  status                TEXT DEFAULT 'pending' CHECK (status IN ('pending','voting','upheld','rejected')),
  council_vote          TEXT CHECK (council_vote IN ('uphold','reject',NULL)),
  council_vote_note     TEXT,
  council_voter_id      UUID REFERENCES users(id),
  supervisor_vote       TEXT CHECK (supervisor_vote IN ('uphold','reject',NULL)),
  supervisor_vote_note  TEXT,
  supervisor_voter_id   UUID REFERENCES users(id),
  supervisor_voter_label TEXT,
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON appeals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- complaint_deletions
CREATE TABLE IF NOT EXISTS complaint_deletions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id     UUID REFERENCES complaints(id) ON DELETE CASCADE,
  requested_by     UUID REFERENCES users(id),
  reason           TEXT NOT NULL,
  council_approved BOOLEAN DEFAULT false,
  superior_approved BOOLEAN DEFAULT false,
  superior_id      UUID REFERENCES users(id),
  superior_note    TEXT,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE complaint_deletions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON complaint_deletions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- safe_dialogues
CREATE TABLE IF NOT EXISTS safe_dialogues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message         TEXT NOT NULL,
  is_anonymous    BOOLEAN DEFAULT false,
  student_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  status          TEXT DEFAULT 'open' CHECK (status IN ('open','replied','closed')),
  counselor_reply TEXT,
  replied_by      UUID REFERENCES users(id),
  replied_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE safe_dialogues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON safe_dialogues FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### RLS Policy Note

The `erasure_requests` migration uses `auth.uid()` in RLS policies:
```sql
CREATE POLICY "Users can see own erasure requests" ON erasure_requests FOR SELECT
  USING (user_id = auth.uid());
```

This app uses **custom JWT**, not Supabase Auth. `auth.uid()` will always return `null`. These policies are effectively no-ops. Since the backend uses the service key (which bypasses RLS entirely), this doesn't break functionality but gives a false sense of security. Either remove the policies or add a service-role-only policy like all other tables.

---

## Complete Issue Checklist (Priority Order)

### Must Fix Before Launch (CRITICAL / HIGH)
- [ ] **S-01** Add auth to `/api/test-whatsapp` endpoint
- [ ] **S-02** Add assigned-handler check in `/status`, `/resolve`, `/escalate` endpoints
- [ ] **S-03** Add complaint access control to `/timeline` endpoint
- [ ] **S-04** Create `notifications` table (run DDL above before schema.sql indexes work)
- [ ] **S-05** Fix `complaints.status` CHECK constraint to include all used statuses
- [ ] **B-01** Fix `allowRoles(STAFF_ROLES)` → `allowRoles(...STAFF_ROLES)` in notes.js
- [ ] **B-02** Remove `submitted_at` from complaint_feedback upsert in complaints.js:1680
- [ ] **B-09** Fix `vpc-otp-verify` to set `vpc_status: 'granted'` not `'approved'`

### Should Fix Before Launch (HIGH / MEDIUM)
- [ ] **S-07** Remove JWT token from response body in auth.js (register + verify-otp)
- [ ] **B-03** Consolidate duplicate feedback routes (remove PATCH /:id/feedback)
- [ ] **B-08** Fix email status change link to use UUID not complaint number
- [ ] **Q-03** Fix `migration_skills_assignment.sql` — add `IF NOT EXISTS`
- [ ] **S-08** HTML-escape user.name in vpcPage() function
- [ ] **B-05** Reset `is_auto_escalated` flag on complaint reopen
- [ ] **Q-06** Fix appeal complaint number padding to 4 digits

### Create Missing Tables (Required for Features to Work)
- [ ] Create `notifications` table (critical — referenced everywhere)
- [ ] Create `complaint_access_log` table
- [ ] Create `internal_notes` table (B-01 fix also needed)
- [ ] Create `appeals` table
- [ ] Create `complaint_deletions` table
- [ ] Create `safe_dialogues` table

### Nice to Have
- [ ] **Q-01** Refactor audit log to push pagination to DB
- [ ] **Q-02** Extract guardian child-lookup logic to shared helper
- [ ] **Q-04** Remove hardcoded developer email from email.js
- [ ] **Q-05** Add max length validation (5000 chars) on complaint description
- [ ] **S-09** Use `crypto.randomInt` for VPC OTP dev fallback
- [ ] **B-04** Guard POSH/POCSO complaints in status update endpoint
- [ ] **B-07** Address consensus vote race condition
- [ ] **B-10** Narrow auto-escalation idempotency check pattern

---

*Report generated: 2026-05-14. Total files reviewed: 26 server files, 60+ client files, 8 migration files, 1 schema file.*
