# KILO CODE — FINAL TASKS PROMPT (V2)
# Vox DPSI | Complete All Remaining Features + Verify In-Progress Work

---

## CONTEXT

Vox DPSI is a student grievance management system for Delhi Public School Indore, being presented live to the school Principal. Built with React + Vite (Vercel), Node.js + Express (Railway), Supabase (PostgreSQL).

- **Frontend:** https://vox-dpsi.vercel.app
- **Backend:** https://vox-dpsi-production-6d95.up.railway.app
- **Repo:** https://github.com/Arrunabh-Singh/VOX-DPSI
- **Demo password (all accounts):** `demo123`

**Current server state:** The backend was repaired and a fresh commit (07a2650) was pushed to GitHub on May 9 at 17:08 IST. Railway should be deploying it now. Wait for `/health` to return `{"status":"ok"}` before doing any server-side work.

---

## ⚠️ CRITICAL RULES — READ BEFORE TOUCHING ANY FILE

The previous session left the server broken because file writes appended null bytes (`\x00`) to server files. This has now been fixed. **Do NOT let it happen again.**

### After every file write to a server JS file, run:
```bash
python3 -c "
import sys
with open(sys.argv[1], 'rb') as f: c = f.read()
n = c.count(b'\x00')
if n: print(f'NULL BYTES ({n}) FOUND — DO NOT COMMIT'); sys.exit(1)
else: print('clean')
" server/routes/YOURFILE.js
node --check server/routes/YOURFILE.js && echo "SYNTAX OK"
```

### After every file write to a server JS file, check it's not truncated:
```bash
tail -3 server/routes/YOURFILE.js   # must end with "export default router"
```

### Full server scan before every commit:
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
"
```

**Never commit if any file fails this scan.**

---

## WHAT'S ALREADY DONE — DO NOT REBUILD

The following are **complete and working** (do not touch unless a task explicitly says to modify them):

- Full complaint lifecycle (raise → verify → escalate → resolve → close → reopen)
- All 8 roles with JWT HttpOnly cookie auth
- Anonymity system with council-controlled reveal
- POSH/POCSO keyword triage
- Analytics dashboard (Recharts: FCR, CSAT, SLA breach, heatmap, response time histogram)
- Email notifications (Nodemailer)
- In-app notification bell
- Round-robin auto-assignment (`POST /api/complaints/:id/auto-assign`)
- Skills-based assignment (`POST /api/complaints/:id/skills-assign`)
- Delegation (council members can hand off to substitutes)
- Consensus voting for sensitive complaints
- Audit log viewer
- Session timeout + auto-logout
- VPC (Verifiable Parental Consent) flow
- Privacy notice gate
- Data erasure requests
- POSH IC member role
- KnowledgeBase, RaiseComplaint, ComplaintDetail, all role dashboards
- `server/routes/safeDialogue.js` — fully built
- `server/routes/guardian.js` — fully built
- `client/src/pages/GuardianDashboard.jsx` — fully built
- `client/src/components/SuggestionBox.jsx` — fully built, wired into StudentDashboard

---

## TASK ORDER (do in this sequence)

---

## TASK A — Verify + Complete In-Progress Items

These were marked "in_progress" by the previous session but some pieces are missing.

### A1 — CouncilOnboarding page is MISSING (#70)

**Problem:** `client/src/App.jsx` imports `CouncilOnboarding` from `./pages/CouncilOnboarding` and has an `OnboardingGate` that redirects `council_member` users to `/onboarding` if `user.onboarding_completed !== true`. But the file **does not exist**. Every council login crashes the app with a module-not-found error.

**Build:** `client/src/pages/CouncilOnboarding.jsx`

This is a mandatory training module council members must complete before accessing their dashboard. It should:

1. Show 5 slides (progress indicator at top):
   - Slide 1 — **Welcome**: "Welcome to Vox DPSI. As a council member you are the first point of contact for every student complaint. Your role is to listen, verify, and resolve — or escalate when needed."
   - Slide 2 — **The Process**: Show a visual flow: Raised → Verified (meet student in person) → In Progress → Resolved / Escalate. Use status colors from `constants.js`.
   - Slide 3 — **Anonymity Rules**: "A student may request anonymity. You will ALWAYS see their real name. If you escalate to a teacher or above, you must decide whether to reveal their identity. This decision is permanent and logged."
   - Slide 4 — **SLA Commitment**: "You have 72 hours to take the first action on any complaint. After that, it auto-escalates. Check your dashboard daily."
   - Slide 5 — **Your Pledge**: Large text "I understand my responsibilities as a Vox DPSI council member." + a checkbox "I agree to handle all complaints with integrity and confidentiality." + a **Begin** button (disabled until checkbox is ticked).

2. On clicking **Begin**:
   - Call `PATCH /api/users/me` with `{ onboarding_completed: true }`
   - Redirect to `/council` dashboard

3. If the user is already `onboarding_completed: true`, redirect immediately to `/council`.

4. Style: DPS green (`#2d5c26`) header, gold (`#c9a84c`) accents. Full-screen layout. No navbar. Mobile + tablet friendly.

**Server:** In `server/routes/users.js`, the `PATCH /api/users/me` route already exists and accepts `onboarding_completed`. Confirm it's there — if not, add:
```js
if (typeof updates.onboarding_completed === 'boolean') allowed.onboarding_completed = updates.onboarding_completed
```

**Also ensure** `GET /api/auth/me` returns `onboarding_completed` in the user object (it already selects it in the current code — just verify).

**Verify:** Login as `council@dpsi.com` → should see onboarding slides → complete them → reach CouncilDashboard. On second login, should skip directly to dashboard.

---

### A2 — Verify Safe Dialogue is wired end-to-end (#69)

The server route `safeDialogue.js` exists and is mounted at `/api/safe-dialogue`. The `SuggestionBox` component exists and is used in `StudentDashboard`. The `CoordinatorDashboard` has a "Suggestions" tab.

**Check:** Does `CoordinatorDashboard.jsx` actually render the counselor reply interface from `SuggestionBox` (or a similar component)? Open the file and verify there's a list + reply form for coordinators. If the Suggestions tab just shows an empty `<div>` or placeholder, build it out:

```
GET /api/safe-dialogue → coordinator sees all messages, can reply
PATCH /api/safe-dialogue/:id/reply → coordinator sends reply
```

The student side already works (SuggestionBox in StudentDashboard). The coordinator side is what needs verifying.

**If the coordinator reply UI is missing**, add a proper list to `CoordinatorDashboard.jsx` in the Suggestions tab showing:
- Each message card: anonymous/named label, message text, date, status badge
- "Reply" textarea + button for open messages
- Green "Replied" badge for messages already answered

---

### A3 — Verify Guardian Dashboard works end-to-end (#63)

`GuardianDashboard.jsx` (93 lines) and `server/routes/guardian.js` (177 lines) exist. App.jsx has `guardian` in the role → dashboard map.

**Check:** Does `GuardianDashboard.jsx` actually call the API and render complaint data? Read the file. If it's mostly a stub (empty state, no API call, no list), build it out properly.

A guardian should see:
- Their linked student's name at the top
- All of that student's complaints in a read-only list (complaint_no, domain, status, date)
- Click through to a read-only complaint detail view
- Their VPC consent status (approved/pending/rejected)

The `GET /api/guardian/complaints` route should already exist in `guardian.js`. If not, add it.

**No guardian accounts are seeded** — that's fine for demo, but make sure the role routes to `GuardianDashboard` in `App.jsx` without crashing.

---

### A4 — Auto-assignment Rules Engine (#39)

Round-robin (`/auto-assign`) and skills-based (`/skills-assign`) already exist. What's missing is a **configurable rules engine** — a UI where coordinators/principals can set rules like "All infrastructure complaints go to council member X" or "All complaints from section XII B go to Y."

**Server — `server/routes/config.js`** (already exists and is mounted). Add to it:

```
GET  /api/config/assignment-rules     — list all rules
POST /api/config/assignment-rules     — create a rule
DELETE /api/config/assignment-rules/:id — delete a rule
```

Rule schema (store in `system_config` table under key `assignment_rules` as a JSONB array):
```json
{
  "id": "uuid",
  "name": "Infrastructure → Priya",
  "condition_type": "domain" | "section" | "house",
  "condition_value": "infrastructure" | "XII B" | "Prithvi",
  "assign_to_id": "council_member_uuid",
  "assign_to_name": "Priya Verma",
  "priority": 1,
  "created_at": "..."
}
```

In `POST /api/complaints` (complaint creation), after the complaint is created, check rules in priority order. If a rule matches `domain` or `section` or `house` of the complaint/student, auto-assign to that council member. Falls back to round-robin if no rule matches.

**Client — Assignment Rules UI in `CoordinatorDashboard.jsx`** and `PrincipalDashboard.jsx`:

Add a new tab "⚙️ Assignment Rules" that shows:
- A table of current rules (name, condition, assigned to, priority, delete button)
- A form to add a new rule: condition type dropdown, condition value input, council member picker (fetched from `GET /api/users?role=council_member`), priority number
- Save button

---

## TASK B — New Features (Never Built)

---

### B1 — WhatsApp Notifications (#27)

The Twilio integration is already partially set up in `server/services/whatsapp.js`. The `TWILIO_WHATSAPP_FROM`, `TWILIO_ACCOUNT_SID`, and `TWILIO_AUTH_TOKEN` env vars are set in Railway.

**What to build:**

In `server/services/notifications.js`, the `createNotification` function already exists. Add a WhatsApp send alongside each notification:

```js
// After creating an in-app notification, also send WhatsApp if user has opted in
const { data: recipient } = await supabase.from('users').select('phone, whatsapp_opt_in').eq('id', userId).single()
if (recipient?.phone && recipient?.whatsapp_opt_in) {
  await sendWhatsApp(recipient.phone, body)  // uses existing whatsapp.js
}
```

Trigger WhatsApp messages on:
1. Complaint assigned to council member
2. Complaint status changed (raised → verified → resolved etc.)
3. Complaint escalated to teacher/coordinator/principal
4. SLA about to breach (from autoEscalate cron)

**Message format** (keep it short — WhatsApp has character limits):
```
Vox DPSI: Your complaint VOX-0042 (Infrastructure) has been resolved.
Reply STOP to unsubscribe.
```

**Client:** In `StudentDashboard.jsx`, add a "WhatsApp Notifications" toggle in the profile area that calls `PATCH /api/auth/whatsapp-optin`. The phone OTP verification flow already exists — link to it if phone not yet verified.

---

### B2 — SMS Notifications via MSG91 (#46)

The MSG91 client is already set up in `server/services/msg91.js`. The env vars `MSG91_AUTH_KEY` and `MSG91_OTP_TEMPLATE_ID` are set.

Add an SMS send alongside each WhatsApp notification (same triggers as B1, same message format). Use `sendSmsOtp` / or a new `sendSmsAlert(phone, message)` function in `msg91.js`:

```js
export async function sendSmsAlert(phone10, message) {
  // MSG91 Send SMS API
  const url = 'https://api.msg91.com/api/v5/flow/'
  // Use a template ID for alerts — or if not configured, log and skip
}
```

If `MSG91_AUTH_KEY` is not set, gracefully skip (log a warning, don't crash).

---

### B3 — OTP-Based Parental Verification (#80)

Currently VPC sends a clickable email link. This task replaces (or supplements) it with an SMS OTP sent to the parent's phone.

**Server — add to `server/routes/auth.js`:**

```
POST /api/auth/vpc-otp-request  — student submits parent phone; server sends OTP via MSG91
POST /api/auth/vpc-otp-verify   — student submits OTP; server sets vpc_status = 'approved'
```

**Client — `VpcGate.jsx`:**

Add a tab switcher: "Via Email" (existing flow) | "Via SMS (Faster)". The SMS flow:
1. Parent phone number input (Indian format, 10 digits)
2. "Send OTP" button → calls `/api/auth/vpc-otp-request`
3. OTP entry field (same digit-box style as login OTP)
4. "Verify" button → calls `/api/auth/vpc-otp-verify`
5. On success: `vpc_status` updates to `approved`, VpcGate closes

If MSG91 is not configured (dev), show the OTP in the response the same way login OTP works.

---

### B4 — Uptime Monitoring (#66)

This is a documentation + configuration task, not code.

**Create file `UPTIME_MONITORING.md` in the repo root:**

```markdown
# Uptime Monitoring — Vox DPSI

## Endpoints to monitor

| Service | URL | Expected Response |
|---------|-----|-------------------|
| Backend health | https://vox-dpsi-production-6d95.up.railway.app/health | `{"status":"ok"}` |
| Frontend | https://vox-dpsi.vercel.app | HTTP 200 |

## Setup (UptimeRobot — free tier)

1. Go to https://uptimerobot.com → Sign up free
2. Add Monitor → HTTP(s) → URL: backend health endpoint → Interval: 5 minutes
3. Add Monitor → HTTP(s) → URL: frontend → Interval: 5 minutes
4. Alert Contacts → Add email: arrunabh.s@gmail.com
5. Optional: Add Slack webhook if Slack is connected

## Alert thresholds

- Backend down for >2 minutes → immediate email alert
- Frontend down for >5 minutes → email alert

## Status page

UptimeRobot provides a free public status page. Share URL with principal as proof of monitoring.
```

Also add a `GET /api/health` route that returns more detail:
```js
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    ts: Date.now(),
    uptime_seconds: Math.floor(process.uptime()),
    env: process.env.NODE_ENV || 'development',
    version: '2.0.0'
  })
})
```

---

### B5 — Vendor DPAs Documentation (#75)

**Create file `VENDOR_DPAS.md` in the repo root:**

```markdown
# Vendor Data Processing Agreements — Vox DPSI

Under DPDP Act 2023 and good data governance practice, the following vendors
process personal data on behalf of DPS Indore and require DPAs.

## Status

| Vendor | Service | DPA Available | Action Required |
|--------|---------|--------------|-----------------|
| Supabase (DigitalOcean) | Database + Storage | ✅ Via Supabase DPA | Sign in Supabase dashboard → Settings → Legal |
| Vercel | Frontend hosting | ✅ Via Vercel DPA | Sign at vercel.com/legal/dpa |
| Railway | Backend hosting | ✅ Via Railway ToS + DPA | Sign at railway.app/legal |
| Twilio | WhatsApp/SMS | ✅ Twilio DPA | Sign at twilio.com/legal/data-protection |
| Google Fonts | Typography (CDN) | ✅ Google DPA | Accepted via Google ToS |
| Nodemailer (SMTP via Gmail) | Email | N/A (uses your own Gmail SMTP) | School must have Google Workspace EDU DPA |

## Action Items for School Administration

1. Principal/IT head to sign Supabase DPA at: https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/settings/general
2. Print + retain Vercel and Railway DPA PDFs for school records
3. Verify Google Workspace EDU agreement covers student data processing for email
4. Document signed DPAs in school's DPIA (see DPIA.md)

## Data Flows Summary

- Student name, email, scholar number → stored in Supabase (India-adjacent region)
- Complaint content → stored in Supabase, encrypted at rest
- Attachments → stored in Supabase Storage private bucket, signed URLs only
- Notification emails → sent via Nodemailer → school Gmail SMTP → recipient inbox
- WhatsApp/SMS → student/guardian phone numbers sent to Twilio API
- No data sold or shared with third parties

Last updated: May 2026
```

---

### B6 — DPDP Act 2023 Formal Compliance Audit (#29)

**Create file `DPDP_COMPLIANCE_AUDIT.md` in the repo root:**

Document the DPDP Act 2023 (India) compliance status for each requirement:

```markdown
# DPDP Act 2023 Compliance Audit — Vox DPSI

**Audit date:** May 2026
**Auditor:** Arrunabh Singh (School President candidate, DPS Indore)

## Section 4 — Grounds for Processing

✅ COMPLIANT — Processing is based on:
- Student consent (captured via PrivacyNoticeGate on first login)
- Parental consent for students under 18 (VPC flow, DPDP Act Section 9)
- Legitimate interest of school in managing grievances

## Section 5 — Notice

✅ COMPLIANT — Privacy notice shown to all users on first login (PrivacyNoticeGate.jsx).
Notice includes: what data is collected, why, how long retained, rights available.

## Section 6 — Consent

✅ COMPLIANT — Explicit checkbox consent on first login. Stored in `is_privacy_acknowledged` field.
Consent timestamp stored in `privacy_acknowledged_at`.

## Section 8 — Accuracy

✅ COMPLIANT — Users can update their profile via PATCH /api/users/me.

## Section 9 — Children's Data (CRITICAL)

✅ COMPLIANT — Verifiable Parental Consent (VPC) flow implemented.
- Students see VpcGate on first login
- Parent email captured → consent link sent
- `vpc_status` field tracks: pending / approved / rejected
- Students cannot raise complaints until VPC is approved

## Section 11 — Right to Withdraw Consent / Erasure

✅ COMPLIANT — Data erasure requests implemented (DataErasureModal.jsx).
Requests stored in `erasure_requests` table, reviewed by coordinator.

## Section 12 — Grievance Redressal

✅ COMPLIANT — This entire system IS the grievance redressal mechanism for school complaints.
For DPDP-specific data complaints, students should contact: arrunabh.s@gmail.com

## Section 16 — Data Fiduciary Obligations

⚠️ PARTIAL — The following remain outstanding:
1. Formal Data Protection Officer (DPO) appointment — recommended: School Principal
2. Vendor DPAs to be signed (see VENDOR_DPAS.md)
3. Annual compliance review process not yet formalised

## Data Retention

✅ COMPLIANT — Complaints older than 2 years auto-archived via retention cron job.

## Breach Notification

✅ COMPLIANT — Breach notification playbook documented in BREACH_RESPONSE.md.

## Pending Actions

| Action | Owner | Deadline |
|--------|-------|----------|
| Appoint formal DPO | Principal | Before production launch |
| Sign Vendor DPAs | IT Head / Principal | Before production launch |
| Annual DPDP review | School Administration | May 2027 |
| Mumbai region migration (data residency) | Dev team | Q3 2026 |
```

---

### B7 — Google Calendar Integration (#45)

Add a "Schedule Follow-up" button on complaint detail pages for council members / coordinators. Clicking it should open a Google Calendar event pre-filled with complaint details.

**Implementation** (no OAuth required — use the calendar URL API):

In `ComplaintDetail.jsx`, add below the action buttons:

```jsx
function CalendarButton({ complaint }) {
  const title = encodeURIComponent(`Follow-up: ${complaint.complaint_no_display} (${complaint.domain})`)
  const details = encodeURIComponent(`Complaint: ${complaint.description.substring(0, 200)}`)
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000) // tomorrow
  const dateStr = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dateStr}/${dateStr}`
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
       style={{ /* gold outlined button */ }}>
      📅 Schedule Follow-up
    </a>
  )
}
```

Show this button only for `council_member`, `class_teacher`, `coordinator`, and `principal` roles (not students or supervisors).

---

### B8 — Staging Environment Documentation (#65)

**Create `STAGING_SETUP.md` in the repo root:**

```markdown
# Staging Environment Setup — Vox DPSI

A staging environment allows testing before pushing to production.

## Architecture

| Layer | Production | Staging |
|-------|-----------|---------|
| Frontend | vox-dpsi.vercel.app | vox-dpsi-staging.vercel.app |
| Backend | Railway (main branch) | Railway (staging branch) |
| Database | Supabase (prod project) | Supabase (staging project) |

## Setup Steps

### 1. Create Supabase staging project
1. https://supabase.com → New project → "vox-dpsi-staging"
2. Run schema_and_seed.sql in the staging SQL editor
3. Copy the staging SUPABASE_URL and SUPABASE_SERVICE_KEY

### 2. Create Railway staging service
1. Railway dashboard → New Service → GitHub repo → branch: `staging`
2. Set env vars (same as prod but with staging Supabase keys)
3. Note the staging Railway URL

### 3. Create Vercel staging deployment
1. Vercel dashboard → vox-dpsi project → Settings → Git → Add branch: `staging`
2. Set VITE_API_URL to the staging Railway URL
3. Staging auto-deploys on push to `staging` branch

### 4. Git workflow
```
git checkout -b staging
# make changes, test locally
git push origin staging   # → deploys to staging
# if good:
git checkout main && git merge staging && git push origin main  # → deploys to production
```

## Test Accounts (staging only)
Same credentials as production — seed.sql populates them.
```

---

### B9 — Mumbai Region Migration Notes (#81)

Add a section to `CLAUDE.md` under "Pending Tasks" with the exact migration steps for when it's needed. This is a documentation task only — **do not actually migrate** (the current Supabase region is fine for demo).

In `CLAUDE.md` update entry #81 to include:
```
Steps when ready:
1. Supabase: New project in ap-south-1 (Mumbai)
2. pg_dump the existing project → pg_restore to new project
3. Update SUPABASE_URL + SUPABASE_SERVICE_KEY in Railway env vars
4. Update VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in Vercel env vars
5. Test auth + file storage (bucket policies need reapplication)
6. Update CLAUDE.md with new Supabase project ID
```

---

## TASK C — Final QA Pass

After completing all tasks above, do a full demo flow test before committing:

### C1 — Server health
```bash
curl https://vox-dpsi-production-6d95.up.railway.app/health
# Must return: {"status":"ok","ts":...}
```

### C2 — Demo flow (all roles)

1. **Student** (`5411@student.dpsindore.org` / `demo123`):
   - Login → OTP screen → no yellow dev banner → dashboard loads
   - Raise complaint: pick Infrastructure, write 100+ chars, toggle anonymous, submit
   - See VOX-XXXX confirmation → click "Complaint Details" → detail loads (NOT 404)
   - Full green background — no cream/beige gaps

2. **Council Member** (`council@dpsi.com` / `demo123`):
   - First login → should see CouncilOnboarding slides (if not yet completed)
   - Tick checkbox → click Begin → reach CouncilDashboard
   - See complaint from student with "(Anon Req)" badge
   - Mark Verified → Mark In Progress → Escalate (choose NO to anonymity)

3. **Coordinator** (`coordinator@dpsi.com` / `demo123`):
   - See escalated complaint as "Anonymous Student"
   - Check Suggestions tab → see any messages from students
   - Check Assignment Rules tab → create a test rule

4. **Principal** (`principal@dpsi.com` / `demo123`):
   - Full dashboard: stats, Analytics tab, Council Tenure tab, Audit Log tab
   - All tabs render without crashing

5. **Supervisor** (`supervisor@dpsi.com` / `demo123`):
   - All-system overview, full names always visible, stats visible

### C3 — Final syntax check
```bash
cd server
for f in index.js routes/*.js db/*.js middleware/*.js utils/*.js services/*.js jobs/*.js; do
  [ -f "$f" ] || continue
  node --check "$f" || echo "SYNTAX ERROR: $f"
done
echo "done"
```
Every file must pass. Do NOT push if any fails.

---

## COMMIT STRATEGY

After completing each task group, commit with a descriptive message:

```bash
# After Task A (verify/complete in-progress):
git add client/src/pages/CouncilOnboarding.jsx [other changed files]
git commit -m "feat: council onboarding page (#70), verify safe dialogue + guardian (#63, #69)"

# After Task B (new features):
git add [new files]
git commit -m "feat: WhatsApp/SMS notifications (#27, #46), OTP parental verify (#80), assignment rules (#39), calendar integration (#45), compliance docs (#29, #65, #66, #75, #81)"

# Final commit after QA:
git commit -m "fix: post-QA fixes from full demo flow test"
git push origin main
```

---

## AFTER ALL TASKS ARE DONE

Reply here with:
> "All tasks complete. Railway: OK. Vercel: OK. Demo flow: PASSED."

Claude will then run a final live QA pass and rate the session.

---

## QUICK REFERENCE

| Role | Email | Password |
|------|-------|----------|
| Student | 5411@student.dpsindore.org | demo123 |
| Council | council@dpsi.com | demo123 |
| Teacher | teacher@dpsi.com | demo123 |
| Coordinator | coordinator@dpsi.com | demo123 |
| Principal | principal@dpsi.com | demo123 |
| Supervisor | supervisor@dpsi.com | demo123 |

| Service | URL |
|---------|-----|
| Frontend | https://vox-dpsi.vercel.app |
| Backend health | https://vox-dpsi-production-6d95.up.railway.app/health |
| GitHub | https://github.com/Arrunabh-Singh/VOX-DPSI |
| Supabase | https://supabase.com/dashboard/project/gznhziptmydkalsrazpj |
