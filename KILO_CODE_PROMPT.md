# KILO CODE — ULTIMATE FIX PROMPT
# Vox DPSI | Demo-Ready Deadline | All Bugs Must Be Resolved

---

## CONTEXT
Vox DPSI is a student grievance system for Delhi Public School Indore.
It will be demoed live to the school Principal. The app must be **flawless**.

- **Frontend:** https://vox-dpsi.vercel.app (Vercel, auto-deploys from main)
- **Backend:** https://vox-dpsi-production-6d95.up.railway.app (Railway, auto-deploys from main)
- **Repo:** https://github.com/Arrunabh-Singh/VOX-DPSI
- **Demo password (all accounts):** demo123

The backend is **currently down** (502 on every request) due to a bug in the last push.
Fix BUG-07 first — nothing else can be tested until the server is running again.

---

## HOW TO VERIFY YOUR FIXES BEFORE COMMITTING

After each file edit, always run:
```bash
node --check server/routes/complaints.js
node --check server/index.js
# For all other server files:
node --check server/routes/<filename>.js
```

After pushing, wait 2-3 minutes then confirm:
```bash
# Backend health check (via browser or curl):
https://vox-dpsi-production-6d95.up.railway.app/health
# → Must return: {"status":"ok","ts":...}
```

---

## BUG-07 — NULL BYTES CRASH THE SERVER (CRITICAL — FIX THIS FIRST)
**File:** `server/routes/complaints.js`
**Symptom:** Railway returns 502 "Application failed to respond" on every request.
**Root cause:** Null bytes (`\x00`) were appended to the end of `complaints.js` during a file write,
causing `SyntaxError: Invalid or unexpected token` when Node.js loads the module.

### Exact Fix:
```bash
python3 -c "
with open('server/routes/complaints.js', 'rb') as f:
    content = f.read()
clean = content.replace(b'\x00', b'').rstrip() + b'\n'
with open('server/routes/complaints.js', 'wb') as f:
    f.write(clean)
print('Fixed. Bytes removed:', len(content) - len(clean))
"
```

Then verify:
```bash
node --check server/routes/complaints.js && echo "SYNTAX OK"
```

Then commit immediately:
```bash
git add server/routes/complaints.js
git commit -m "fix: remove null bytes from complaints.js (crashed Railway on startup)"
git push origin main
```

**Wait 3 minutes. Open https://vox-dpsi-production-6d95.up.railway.app/health in a browser.**
**It must return JSON before you proceed to any other fix.**

---

## BUG-05 — "COMPLAINT NOT FOUND" IMMEDIATELY AFTER SUBMISSION (CRITICAL)
**File:** `server/routes/complaints.js`
**Symptom:** Student submits complaint → sees "VOX-0026 received" confirmation → clicks
"Complaint Details" → page shows "Complaint not found." and a toast error fires.
The complaint IS in the database (visible in the dashboard list). Only the detail view breaks.

### Root Cause:
The `GET /api/complaints/:id` route has a secondary query or insert that fails when:
- `assigned_council_member_id` is NULL (complaint is newly raised, not yet assigned)
- `complaint_access_log` insert throws an RLS/schema error that crashes the entire response

### Exact Fix in `server/routes/complaints.js`, inside `router.get('/:id', ...)`:

**Step 1 — Find the complaint_access_log insert and wrap it in try/catch:**
```js
// BEFORE (crashes whole response if insert fails):
await supabase.from('complaint_access_log').insert({
  complaint_id: id,
  viewer_id: req.user.id,
  viewer_role: req.user.role,
  accessed_at: new Date().toISOString(),
})

// AFTER (non-fatal — log error but continue):
try {
  await supabase.from('complaint_access_log').insert({
    complaint_id: id,
    viewer_id: req.user.id,
    viewer_role: req.user.role,
    accessed_at: new Date().toISOString(),
  })
} catch (logErr) {
  console.error('[non-fatal] complaint_access_log insert failed:', logErr.message)
}
```

**Step 2 — Ensure student access check uses OR logic (own complaint OR assigned):**
The student access check should be:
```js
if (req.user.role === 'student') {
  // Student can always see their own complaint regardless of assignment status
  if (complaint.student_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' })
  }
}
```
Make sure there is NO additional filter that requires `assigned_council_member_id` to be non-null
for a student to view their own complaint.

**Step 3 — Null-guard any join that references assigned_council_member_id:**
If the query does a join like:
```js
.select('*, council_member:assigned_council_member_id(id, name), ...')
```
This is fine — Supabase returns `null` for the join when the FK is null. But if your code then does:
```js
const councilMemberName = complaint.council_member.name  // CRASHES if council_member is null
```
Add null guards:
```js
const councilMemberName = complaint.council_member?.name ?? 'Unassigned'
```
Search for ALL places in the GET /:id handler where you access nested join objects and add `?.` optional chaining.

---

## BUG-01 — CREAM/BEIGE DEAD ZONE ON ALL PAGES (HIGH)
**File:** `client/src/index.css`
**Symptom:** Every page shows a ~390px wide cream/beige band on the right side and ~280px
of cream below the footer. The green app background doesn't stretch to fill the full viewport.

### Exact Fix:
Find line 24 in `client/src/index.css`:
```css
/* CURRENT (broken): */
html, body, #root { height: 100vh; background-color: #1a2e16; }
```
Replace with:
```css
/* FIXED: */
html, body, #root {
  min-height: 100vh;
  width: 100%;
  background-color: #1a2e16;
}
```

**Why this works:** `height: 100vh` is a fixed ceiling — content can overflow it and leave
uncovered viewport area. `min-height: 100vh` expands to cover all content.
`width: 100%` ensures no rightward overflow gap.

Also check `client/src/App.jsx` — the outermost wrapper div should NOT have a fixed pixel width.
If it has something like `style={{ maxWidth: '1440px', margin: '0 auto' }}`, that's fine for content,
but the background must extend behind it. Ensure the wrapper's parent (usually `<div id="root">`)
fills full width with the dark green background.

---

## BUG-02 — "DEMO123" UPPERCASE IN LOGIN HINT (MEDIUM)
**File:** `client/src/pages/Login.jsx`
**Symptom:** The demo credentials section shows "DEMO QUICK LOGIN — PASSWORD: DEMO123"
in all caps. The password should show as lowercase `demo123` so users type it correctly.

### Root Cause:
A `<p>` element has `textTransform: 'uppercase'` applied to the whole element including the
inline password text. A `<span>` wrapper was added previously but CSS specificity prevented
it from overriding the parent's `textTransform`.

### Exact Fix:
Find the paragraph that contains the demo password hint. It looks like:
```jsx
<p style={{ ..., textTransform: 'uppercase', ... }}>
  Demo Quick Login — password: <span style={{ textTransform: 'none' }}>demo123</span>
</p>
```
Or possibly:
```jsx
<p style={{ ..., textTransform: 'uppercase', ... }}>
  Demo Quick Login — password: demo123
</p>
```

**Replace the ENTIRE element with this structure (move uppercase to a child span):**
```jsx
<p style={{
  letterSpacing: '0.1em',
  color: 'rgba(255,255,255,0.5)',
  fontSize: '11px',
  fontWeight: '600',
  textAlign: 'center',
  margin: '0 0 10px 0',
  // NO textTransform here on the <p>
}}>
  <span style={{ textTransform: 'uppercase' }}>Demo Quick Login — password: </span>
  <span style={{
    textTransform: 'none',
    letterSpacing: 0,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  }}>demo123</span>
</p>
```

The key: `textTransform: 'uppercase'` moves from the `<p>` to only the LABEL span.
The password span explicitly sets `textTransform: 'none'` at the same specificity level.

---

## BUG-03 — DEV OTP BANNER VISIBLE IN PRODUCTION (HIGH)
**Files:** `client/src/pages/Login.jsx` AND `server/routes/auth.js`
**Symptom:** On the OTP screen (shown after entering email + password), a yellow banner reads:
`⚠️ DEV MODE — SMTP NOT CONFIGURED. Your OTP is: 4 5 4 6 3 5`
This exposes the OTP in plaintext and reveals internal dev configuration to real users.

### Fix Part 1 — client/src/pages/Login.jsx:
Find the devOtp banner render block. It looks like:
```jsx
{devOtp && (
  <div style={{ background: '#fef3c7', ... }}>
    ⚠️ Dev Mode — SMTP not configured. Your OTP is: {devOtp}
  </div>
)}
```
Add `import.meta.env.DEV` guard:
```jsx
{import.meta.env.DEV && devOtp && (
  <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 12 }}>
    ⚠️ Dev Mode — SMTP not configured. Your OTP is: <strong>{devOtp}</strong>
  </div>
)}
```
`import.meta.env.DEV` is `true` during `vite dev` and `false` in production builds.
The banner will now never appear on Vercel.

### Fix Part 2 — server/routes/auth.js:
Find every place where `devOtp` is returned in an API response. There should be at least
two: the login endpoint and the resend-OTP endpoint. Change each from:
```js
res.json({
  message: 'OTP sent',
  devOtp: generatedOtp,   // ← exposed in prod
})
```
To:
```js
res.json({
  message: 'OTP sent',
  // Only expose devOtp outside production:
  ...(process.env.NODE_ENV !== 'production' && { devOtp: generatedOtp }),
})
```
Search for ALL occurrences of `devOtp` in `auth.js` and apply this pattern to each one.

---

## BUG-04 — RAISE COMPLAINT: SILENT FAILURE WHEN NO DOMAIN SELECTED (HIGH)
**File:** `client/src/pages/RaiseComplaint.jsx`
**Symptom:** User types a 100-char description but forgets to pick a domain category.
Clicks "Submit Complaint." Nothing happens — no error, no highlight, no scroll.
The user has zero feedback about what went wrong.

### Exact Fix:

**Step 1 — Add error state near the top of the component:**
```jsx
const [domainError, setDomainError] = useState(false)
```

**Step 2 — Find the domain validation in handleSubmit and replace:**
```jsx
// CURRENT (just a toast, no visual):
if (!domain) return toast.error('Please select a domain')

// REPLACE WITH:
if (!domain) {
  setDomainError(true)
  toast.error('Please select a category for your complaint')
  // Scroll the domain section into view so the user can see what's missing:
  document.querySelector('[data-section="domain"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return
}
setDomainError(false)  // clear error once domain is valid
```

**Step 3 — Find the domain buttons container div and add the data attribute + border:**
```jsx
// Wrap the domain buttons section (the grid/flex of category buttons) like this:
<div
  data-section="domain"
  style={{
    border: domainError ? '2px solid #DC2626' : '2px solid transparent',
    borderRadius: 12,
    padding: domainError ? '8px' : '0',
    transition: 'border-color 0.2s',
  }}
>
  {/* all existing domain category buttons go here unchanged */}
</div>
```

**Step 4 — Clear the error when a domain is selected:**
Find each domain button's `onClick` handler and add `setDomainError(false)`:
```jsx
onClick={() => {
  setDomain(d.key)
  setDomainError(false)  // ← add this line
}}
```

---

## AFTER ALL FIXES ARE APPLIED

### Commit everything together:
```bash
git add -A
git commit -m "fix: BUG-07 null bytes, BUG-05 complaint detail 404, BUG-04 domain validation, BUG-03 OTP banner, BUG-02 password case, BUG-01 viewport dead zone"
git push origin main
```

### Verify deployments:
1. **Railway** — Check https://vox-dpsi-production-6d95.up.railway.app/health → must return `{"status":"ok"}`
2. **Vercel** — Check https://vox-dpsi.vercel.app → login page must load with dark green filling the full screen

### Login flow test:
1. Go to https://vox-dpsi.vercel.app
2. Click the "Council" quick login button
3. Enter OTP from screen (or email if SMTP is working)
4. Confirm you reach the Council dashboard
5. Confirm NO cream/beige gaps anywhere on the page
6. Confirm login page shows `demo123` (lowercase) in the hint

---

## TELL CLAUDE YOU'RE DONE

Once all fixes are pushed and both deployments are green, reply here with:
> "All bugs fixed and deployed. Railway health check: OK. Vercel: OK."

Claude will then run a full live QA pass on https://vox-dpsi.vercel.app testing every role
(Student → Council → Teacher → Coordinator → Principal → Supervisor) and document
any remaining issues in `BUG_FIXES_REQUIRED.md`.

---

## REPEAT CYCLE UNTIL DEMO-READY

```
Kilo fixes → pushes → Claude QA → new bugs → Kilo fixes → pushes → ...
```

This loop continues until a full QA pass returns zero new bugs.
The demo to the Principal of DPS Indore must be flawless.
