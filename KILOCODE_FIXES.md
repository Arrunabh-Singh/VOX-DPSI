# Vox DPSI — Kilo Code Fix Spec
**Authored by:** Claude (reviewer + final pusher)  
**Implementer:** Kilo Code  
**Repo:** `C:\Users\arrun\Documents\VOX DPSI\vox-dpsi-main-push`  
**Branch to push to:** `main` (auto-deploys to Railway + Vercel)

> After implementing ALL fixes below, do NOT push. Claude will review diffs and push.

---

## BUG 1 — Vercel build crash: missing `CouncilOnboarding` page (CRITICAL, blocks deployment)

**Error:**
```
Could not resolve "./pages/CouncilOnboarding" from "src/App.jsx"
```

**Cause:** `client/src/App.jsx` line 44 imports `CouncilOnboarding` but the file `client/src/pages/CouncilOnboarding.jsx` exists yet Vercel can't resolve it — likely a casing mismatch or the file is empty/broken.

**Fix:**
1. Open `client/src/pages/CouncilOnboarding.jsx` and check if it is empty or malformed.
2. If empty/broken, implement the full onboarding page (see BUG 2 below for what it must do).
3. Verify the filename casing exactly matches the import: `./pages/CouncilOnboarding` → file must be named `CouncilOnboarding.jsx` (capital C and O).
4. Run `cd client && npm run build` locally to confirm it compiles before handing back.

---

## BUG 2 — Council onboarding "Complete Onboarding" button is permanently greyed out

**Symptom:** Second screenshot — "Complete Onboarding" button never becomes clickable.

**Fix in `client/src/pages/CouncilOnboarding.jsx`:**
- The button must enable when the commitment checkbox is ticked (`checked === true`).
- Button `disabled` prop must be `!committed` (or whatever the checkbox state variable is called).
- On click, call `PATCH /api/users/me` with `{ onboarding_completed: true }`.
- On success, redirect to `/` (their dashboard).
- The server route already handles this correctly (`server/routes/users.js` line 123).

**Do not change the server.** Only fix the frontend button condition.

---

## BUG 3 — Complaints not loading for students ("Complaint not found")

**Symptom:** First screenshot — student sees "Complaint not found." and toast "Failed to load complaint details."

**Likely cause:** The complaint detail route in `server/routes/complaints.js` or the client-side URL routing is passing the wrong identifier (complaint_no string like "VOX-0001" vs UUID).

**Fix:**
1. Check `client/src/pages/ComplaintDetail.jsx` — what param does it read from the URL? (`useParams()`)
2. Check the API call — is it sending the UUID or the complaint_no?
3. Check `GET /api/complaints/:id` in `server/routes/complaints.js` — does it query by UUID or complaint_no?
4. Make them consistent: the detail page URL should use the UUID (or complaint_no if that's what the server expects). Whichever is correct, fix the other side to match.
5. Also check `client/src/pages/StudentDashboard.jsx` — the link from the complaint card to the detail page must pass the correct identifier.

---

## FEATURE 4 — Remove "Audit Log" tab from Principal dashboard

**What audit log is:** A table of every action ever taken in the system (who logged in, who changed what status, etc.). It's a compliance feature. The user wants it removed from the UI.

**Fix in `client/src/pages/PrincipalDashboard.jsx`:**
- Remove the "Audit Log" tab from the tab list.
- Remove the `<AuditLogViewer />` component render block.
- Do NOT delete `server/routes/auditLog.js` — keep the backend, just hide the UI.
- Same for `client/src/pages/VicePrincipalDashboard.jsx` if it has the tab.

---

## FEATURE 5 — Remove "Council Tenure" tab from Principal dashboard

**What council tenure is:** A panel showing council members' term start/end dates and expiry alerts. User wants it removed.

**Fix in `client/src/pages/PrincipalDashboard.jsx`:**
- Remove the "Council Tenure" tab from the tab list.
- Remove the `<TermLimitPanel />` component render block.
- Do NOT delete backend routes. Just hide the UI.
- Same for `client/src/pages/VicePrincipalDashboard.jsx` if present.

---

## FEATURE 6 — Workflow Templates: restrict write access, clarify read access

**What workflows are:** Predefined step-by-step handling procedures per complaint domain (e.g. "for Infrastructure complaints: step 1 council verifies, step 2 coordinator reviews within 48h"). They guide handlers but don't auto-execute anything.

**Current problem:** `PUT /api/workflow-templates/:domain` has no role guard — any logged-in user can edit workflows.

**Fix in `server/routes/workflowTemplates.js`:**
```js
import { allowRoles } from '../middleware/roleGuard.js'

// Write (PUT) — only principal and supervisor can edit
router.put('/:domain', verifyToken, allowRoles('principal', 'supervisor', 'vice_principal'), async (req, res) => { ... })

// Read (GET) — keep open to all authenticated users (coordinators can view but not edit)
```

**Fix in `client/src/components/WorkflowTemplatesPanel.jsx` (or wherever the edit button lives):**
- Hide the Save/Edit button for `coordinator` role — they can read but not write.
- Show edit controls only for `principal`, `supervisor`, `vice_principal`.

**Note on "VOX-06":** The user referred to "VOX-06" as a role that should have edit access. This likely refers to the `supervisor` role (Arrunabh's account). Confirm with user if a different role is meant. For now, `supervisor` gets edit access.

---

## FEATURE 7 — Delegation end date: max 1 month after start date

**Fix in `client/src/components/DelegationManager.jsx`:**
- In the delegation creation form, find the `end_date` input.
- Add a `max` attribute dynamically computed as: `startDate + 30 days`.
- Also validate on submit: if `end_date > startDate + 30 days`, show toast error "Delegation cannot exceed 1 month" and abort.

Example logic:
```js
const maxEndDate = startDate
  ? new Date(new Date(startDate).setDate(new Date(startDate).getDate() + 30))
      .toISOString().split('T')[0]
  : ''
// Apply to input: <input type="date" max={maxEndDate} ... />
```

**Fix in `server/routes/delegations.js`:**
- On `POST /api/delegations`, validate server-side:
```js
const start = new Date(start_date)
const end   = new Date(end_date)
const diffDays = (end - start) / (1000 * 60 * 60 * 24)
if (diffDays > 31) {
  return res.status(400).json({ error: 'Delegation period cannot exceed 1 month.' })
}
```

---

## FEATURE 8 — Print Report button: visible to coordinator, principal, supervisor only (per complaint)

**Current state:** Print button exists in `ComplaintDetail.jsx` around line 843 but is conditionally shown with mixed role logic.

**Fix in `client/src/pages/ComplaintDetail.jsx`:**
- The Print Report button (calls `printReport()`) must be visible **only** to these roles:
  - `coordinator`
  - `principal`
  - `vice_principal`
  - `supervisor`
- Remove it from `council_member` and `student` views.
- The button should appear prominently on the complaint detail page (not buried).
- Existing `printReport()` function at line 72 is fine — do not change it.

The condition should be:
```jsx
{['coordinator', 'principal', 'vice_principal', 'supervisor'].includes(user?.role) && (
  <button onClick={printReport}>🖨️ Print Report</button>
)}
```

---

## FEATURE 9 — Supervisor ("VOX-06") accounts: assign demo password

**Context:** The user calls supervisor-role accounts "VOX-06". These are read-only oversight accounts.

**Required:** The existing demo supervisor account (`supervisor@dpsi.com`) must have the password set to:
```
Supervisor@2026
```

**Fix:** Run this SQL in Supabase SQL editor (project: `gznhziptmydkalsrazpj`):
```sql
-- Get the bcrypt hash for "Supervisor@2026" with 12 salt rounds
-- You cannot generate bcrypt in SQL directly — do this via a one-time Node script:
```

**Node script to generate and apply (run once locally):**
```js
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const hash = await bcrypt.hash('Supervisor@2026', 12)
await supabase.from('users').update({ password_hash: hash }).eq('email', 'supervisor@dpsi.com')
console.log('Done')
```

Save as `scripts/set-supervisor-password.js`, run with `node scripts/set-supervisor-password.js` with env vars set.

**Also update `client/src/pages/Login.jsx`** — the quick-login demo grid shows `demo123` for all accounts. Update the supervisor quick-login button to NOT auto-fill (or remove it from the demo grid) since it now has a real password.

---

## FEATURE 10 — Daily digest emails: send to actual handlers, not override address

**Current state:** All emails go to `arrunabh.s@gmail.com` (the Resend override). This is intentional for OTP login but NOT for daily digests.

**Clarification from user:** The override behaviour is fine for OTP emails. For daily digest emails, the user wants them going to their address too (since they control the system). No change needed here — keep the override for now.

**Action:** No code change needed for this item. Mark as deferred.

---

## SUMMARY TABLE

| # | Area | File(s) | Type |
|---|------|---------|------|
| 1 | Vercel build crash | `client/src/pages/CouncilOnboarding.jsx`, `client/src/App.jsx` | Bug |
| 2 | Onboarding button greyed out | `client/src/pages/CouncilOnboarding.jsx` | Bug |
| 3 | Complaints not loading | `client/src/pages/ComplaintDetail.jsx`, `server/routes/complaints.js` | Bug |
| 4 | Remove Audit Log tab | `client/src/pages/PrincipalDashboard.jsx` | UI change |
| 5 | Remove Council Tenure tab | `client/src/pages/PrincipalDashboard.jsx` | UI change |
| 6 | Workflow write access | `server/routes/workflowTemplates.js`, `client/src/components/WorkflowTemplatesPanel.jsx` | Access control |
| 7 | Delegation 1-month cap | `client/src/components/DelegationManager.jsx`, `server/routes/delegations.js` | Validation |
| 8 | Print Report button roles | `client/src/pages/ComplaintDetail.jsx` | UI change |
| 9 | Supervisor demo password | `scripts/set-supervisor-password.js`, `client/src/pages/Login.jsx` | Config |
| 10 | Daily digest email routing | — | Deferred |

---

## RULES FOR KILO CODE

1. Fix items in order — BUG 1 first (it blocks Vercel).
2. Do not push to git. Claude reviews and pushes.
3. After each fix, note which files were changed.
4. Run `cd client && npm run build` after all frontend changes to confirm Vercel won't fail.
5. Do not alter `server/services/email.js` — email routing is already handled.
6. Do not alter `server/middleware/auth.js` or `server/middleware/roleGuard.js`.
7. If anything is ambiguous, note it — do not guess and implement the wrong thing.
