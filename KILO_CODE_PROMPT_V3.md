# KILO CODE — TASKS PROMPT (V3)
# Vox DPSI | Bug Fixes + Notification Wiring + Final QA

---

## CONTEXT

Vox DPSI is a student grievance management system for Delhi Public School Indore, being
presented live to the school Principal as part of a student council presidential interview.

- **Frontend:** https://vox-dpsi.vercel.app
- **Backend:** https://vox-dpsi-production-6d95.up.railway.app
- **Repo:** https://github.com/Arrunabh-Singh/VOX-DPSI
- **Demo password (all accounts):** `demo123`
- **Demo student login:** `5411@student.dpsindore.org` / `demo123`
- **Other roles:** `council@dpsi.com`, `teacher@dpsi.com`, `coordinator@dpsi.com`, `principal@dpsi.com`, `supervisor@dpsi.com`

---

## ⚠️ CRITICAL RULES — READ BEFORE TOUCHING ANY FILE

After EVERY write to a server JS file:
```bash
python3 -c "
import sys
with open(sys.argv[1], 'rb') as f: c = f.read()
n = c.count(b'\x00')
if n: print(f'NULL BYTES ({n}) FOUND — DO NOT COMMIT'); sys.exit(1)
else: print('clean')
" path/to/file.js
node --check path/to/file.js && echo "SYNTAX OK"
tail -3 path/to/file.js   # must end with: export default router
```

Full scan before every commit:
```bash
python3 -c "
import glob, os
any_bad = False
for path in glob.glob('server/**/*.js', recursive=True) + ['server/package.json']:
    if not os.path.isfile(path): continue
    with open(path, 'rb') as f: c = f.read()
    n = c.count(b'\x00')
    if n: print(f'NULL BYTES ({n}): {path}'); any_bad = True
if not any_bad: print('ALL CLEAN')
" && echo "SCAN DONE"
```

---

## TASK 1 — CRITICAL BUG: Fix Route Ordering in `server/routes/config.js`

**This is a showstopper.** The assignment rules GET endpoint is unreachable.

**Problem:** `router.get('/:key', ...)` is registered at line 36 — BEFORE `router.get('/assignment-rules', ...)` at line 103. Express matches routes in registration order, so all requests to `/api/config/assignment-rules` are intercepted by the `/:key` handler (with `key = 'assignment-rules'`), which queries the `system_config` table for that key and returns 404. The actual assignment-rules route is never reached.

**Fix:** In `server/routes/config.js`, move the three `/assignment-rules` routes (GET, POST, DELETE) to appear BEFORE the generic `/:key` routes. The final ordering must be:

```
1. GET  /                     (list all config)
2. GET  /assignment-rules     (list rules)
3. POST /assignment-rules     (add rule)
4. DELETE /assignment-rules/:id (delete rule)
5. GET  /:key                 (single config key — catch-all, MUST be last)
6. PATCH /:key                (update config key)
```

After fixing, verify:
```bash
node --check server/routes/config.js && echo "SYNTAX OK"
tail -3 server/routes/config.js
```

---

## TASK 2 — Run Pending Migrations in Supabase

Several SQL migration files exist in the repo root but have NOT been applied to the live database. Without them, multiple features will crash with "table does not exist" errors.

**Migrations to run** (in this order in the Supabase SQL editor at https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql/new):

1. **`migration_system_config.sql`** — creates `system_config` table (required for config.js routes and round-robin assignment). Run this FIRST.
2. **`migration_delegation.sql`** — creates `delegation_rules` table
3. **`migration_consensus.sql`** — creates `complaint_votes` table + adds consensus columns to `complaints`
4. **`migration_term_limits.sql`** — adds `term_start`, `term_end`, `term_role` to `users`
5. **`migration_guardian_role.sql`** — guardian role schema changes (if not already applied)
6. **`migration_phone_fields.sql`** — adds phone column to users (if not already applied)
7. **`migration_skills_assignment.sql`** — skills-based assignment schema (if not already applied)

**To do this programmatically** (using the Supabase MCP or by reading each file and running via the Supabase JS client in a one-time script):

```bash
# Read the migration file
cat migration_system_config.sql
# Then run it via Supabase MCP execute_sql tool or paste into Supabase SQL editor
```

Use the Supabase MCP tool `execute_sql` with project_id `gznhziptmydkalsrazpj` to run each migration. Wrap each in a transaction. If a migration fails because the table/column already exists, that's OK — the `IF NOT EXISTS` guards handle it.

After running migrations, verify the `system_config` table has the `round_robin_index` row:
```sql
SELECT * FROM system_config;
```
Expected: at least one row with `key = 'round_robin_index'`.

---

## TASK 3 — Wire WhatsApp and SMS Notifications to Status Changes

The service files exist (`server/services/whatsapp.js`, `server/services/msg91.js`) but may not be triggered on complaint status changes. Verify and complete the wiring.

### 3a. Check current wiring
```bash
grep -n "sendWhatsApp\|sendWhatsapp\|whatsapp\|msg91\|sendSms\|sendSMS" server/routes/complaints.js | head -30
```

### 3b. If NOT wired up, add triggers in `server/routes/complaints.js`

Find the status update handler (`PATCH /:id/status`, `PATCH /:id/resolve`, `PATCH /:id/escalate`). After updating the DB and sending an email notification, add:

```js
// WhatsApp notification (non-blocking — don't let failure crash the response)
try {
  if (student?.phone) {
    await sendWhatsAppNotification(student.phone, {
      complaintNo: complaint.complaint_no,
      status: newStatus,
      studentName: student.name
    })
  }
} catch (e) {
  console.warn('WhatsApp notification failed (non-fatal):', e.message)
}
```

The WhatsApp/SMS calls must be **non-blocking** — wrap in try/catch so a Twilio/MSG91 failure never causes the complaint action to fail.

### 3c. Verify `server/services/whatsapp.js` exports a sendable function

```bash
node --check server/services/whatsapp.js && echo "SYNTAX OK"
grep -n "export\|function send" server/services/whatsapp.js | head -10
```

If the function signature doesn't match what complaints.js would call, align them.

### 3d. Same for SMS (`server/services/msg91.js`)

```bash
node --check server/services/msg91.js && echo "SYNTAX OK"
grep -n "export\|function send" server/services/msg91.js | head -10
```

---

## TASK 4 — Add `onboarding_completed` Column to `users` Table

`CouncilOnboarding.jsx` calls `PATCH /api/users/me` with `{ onboarding_completed: true }` but the `users` table schema doesn't have this column. Without it, the PATCH silently ignores the field and council members get stuck in an infinite onboarding loop.

**Fix:** Run this migration in Supabase:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
```

Then verify `server/routes/users.js` includes `onboarding_completed` in the allowed update fields for `PATCH /api/users/me`. Look for the `allowedFields` array or similar pattern and add `'onboarding_completed'` if missing.

```bash
grep -n "onboarding" server/routes/users.js
```

If it's not there, add it.

---

## TASK 5 — Full QA Pass on New V2 Features

Do a live QA pass by hitting the production URLs. For each test, check the browser console for errors and check Railway logs for server errors.

### 5a. Council Onboarding flow
1. In Supabase, set `onboarding_completed = false` for `council@dpsi.com`
2. Login as `council@dpsi.com` → should redirect to `/onboarding`
3. Click through all 5 slides → check pledge checkbox → click "Begin"
4. Should redirect to `/council` dashboard — no blank screen, no errors
5. Refresh → should NOT show onboarding again (onboarding_completed = true now)

### 5b. Assignment Rules Panel
1. Login as `coordinator@dpsi.com` or `principal@dpsi.com`
2. Find the Assignment Rules panel in the dashboard (CoordinatorDashboard or PrincipalDashboard)
3. Create a rule: condition = `domain: infrastructure`, assign to council member
4. Verify the rule appears in the list
5. Create a new complaint (as student) with domain Infrastructure
6. Verify it auto-assigns to the correct council member

### 5c. VPC OTP flow (B3)
1. Login as a student without VPC approval
2. VpcGate should show the tab switcher (Email | SMS OTP)
3. Click SMS tab → enter a phone number → click Send OTP
4. The OTP endpoint should respond (even if Twilio isn't live, should return 200 in dev mode)

### 5d. Calendar button in ComplaintDetail
1. Login as `council@dpsi.com` → open any in-progress complaint
2. Check for a "Schedule Follow-up" or calendar button
3. Clicking should open a Google Calendar URL in a new tab with complaint details pre-filled

### 5e. Safe Dialogue / Suggestion Box
1. Login as student → look for "Talk to Counselor" or suggestion box link
2. Submit an anonymous message
3. Login as `coordinator@dpsi.com` → go to Suggestions tab → see the message → reply
4. Login back as student → see the reply

### 5f. Guardian Dashboard
1. The guardian role isn't seeded — create a test user via Supabase SQL:
   ```sql
   INSERT INTO users (name, email, password_hash, role)
   VALUES ('Test Guardian', 'guardian@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uaxFKXWmb', 'guardian');
   ```
   (The hash above is bcrypt of 'demo123')
2. Login as `guardian@test.com` / `demo123` → should land on GuardianDashboard
3. Should see linked student's complaints in read-only mode

### 5g. Knowledge Base
1. Login as student → find the Knowledge Base link (should be in navbar or dashboard)
2. Verify it loads and shows searchable FAQ content

---

## TASK 6 — Fix Any Bugs Found in QA (Task 5)

For each bug found in Task 5, fix it in the appropriate file. Apply the anti-corruption checks after every server file edit.

Common expected issues to watch for:
- **Missing table columns** → run `ALTER TABLE ADD COLUMN IF NOT EXISTS ...` in Supabase
- **Missing route mount** → check `server/index.js` that all routes are mounted
- **Missing page in App.jsx** → check all pages are imported and routed
- **Components not imported in dashboard** → check that new panels (AssignmentRulesPanel, etc.) are actually rendered inside their dashboard

---

## TASK 7 — Demo Data Refresh

The demo needs to look impressive on screen. Run this in Supabase SQL to ensure good demo data:

```sql
-- Ensure demo complaints exist in various statuses
-- Reset onboarding for demo council member so demo flow works
UPDATE users SET onboarding_completed = false WHERE email = 'council@dpsi.com';

-- Verify complaint spread across statuses
SELECT status, COUNT(*) FROM complaints GROUP BY status ORDER BY status;
```

If fewer than 3 complaints exist or all are in one status, seed more. Aim for:
- 1 complaint `raised` (freshly submitted)  
- 1 complaint `in_progress` (council working it)
- 1 complaint `escalated_to_coordinator` (escalated, anonymous)
- 1 complaint `resolved` (with resolution note)
- 1 complaint `escalated_to_principal` (serious case)

---

## TASK 8 — Final Commit and Push

After all tasks are complete:

1. Run the full null-byte scan (see Critical Rules above)
2. Run `node --check` on every modified server file
3. Commit with message: `feat: assignment rules fix, migrations, WhatsApp wiring, V3 QA pass`
4. Push to GitHub
5. Wait for Railway to redeploy (watch logs or hit `/health`)
6. Confirm https://vox-dpsi-production-6d95.up.railway.app/health returns `{"status":"ok"}`
7. Confirm https://vox-dpsi.vercel.app loads the login screen without errors

---

## DEMO FLOW (3 minutes — verify this works end-to-end after all fixes)

1. **Student** (`5411@student.dpsindore.org`) → Raise complaint (Infrastructure, add description, anonymous, optionally attach image) → see VOX-XXXX confirmation
2. **Council** (`council@dpsi.com`) → See complaint with "(Anon Req)" badge → Mark Verified → Mark In Progress → Escalate (choose "No" to keep identity hidden) → fill reason → confirm
3. **Coordinator** (`coordinator@dpsi.com`) → See "Anonymous Student" complaint → Resolve with a note
4. **Principal** (`principal@dpsi.com`) → Full dashboard with stats row → Analytics tab → Council Tenure tab
5. **Supervisor** (`supervisor@dpsi.com`) → All-system view, full names visible

Each step must complete with no console errors, no blank screens, no 500s.

---

## WHAT NOT TO DO

- Do not restructure files that are already working
- Do not change the auth system (HttpOnly cookies)
- Do not add new features not listed above — focus on fixing and verifying what's there
- Do not skip the null-byte + syntax check after every server file write

---

*Generated by Claude (Anthropic) via Cowork mode — May 9, 2026*
*Previous session (V2) rating: 7/10 — tasks complete but config.js route ordering bug breaks assignment rules GET*
