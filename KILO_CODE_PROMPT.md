# Kilo Code Task — Fix All Bugs in BUG_FIXES_REQUIRED.md

## Instructions
Read the file `BUG_FIXES_REQUIRED.md` in this project folder. It contains a list of bugs found by QA testing on the live app. Fix **every bug that does not say FIXED** in the Status line, using the exact file paths and fix instructions provided. After fixing everything, commit and push to GitHub.

**Important:** Claude (the QA agent) will continue to add new bugs to that file after each QA pass. After you've fixed the current bugs and pushed, tell Claude you're done so it can run another QA pass and add more bugs. Keep checking `BUG_FIXES_REQUIRED.md` and fixing whatever is new.

---

## Current Bugs to Fix (as of 2026-05-09)

### BUG-01 — Cream/Beige Dead Zone (HIGH)
**Status: NOT FIXED**

**What:** A large cream/beige blank area appears on the right ~390px and bottom ~280px of every page.

**Root cause identified:** In `client/src/index.css` line 24:
```css
html, body, #root { height: 100vh; background-color: #1a2e16; }
```
`height: 100vh` is a FIXED height — it does not expand when content is taller. Content wider than the root overflows, and the viewport is filled with the body's `--color-bg` (#eae1c4 = cream).

**Fix:** Change line 24 in `client/src/index.css` to use `min-height` and add `width: 100%`:
```css
html, body, #root {
  min-height: 100vh;
  width: 100%;
  background-color: #1a2e16;
}
```
Also ensure no page-wrapper divs have a `maxWidth` that leaves the right side uncovered without a background fill behind it.

---

### BUG-02 — "DEMO123" Shows in Uppercase on Login Page (MEDIUM)
**Status: NOT FIXED**

**What:** The demo section on the login page shows "DEMO QUICK LOGIN — PASSWORD: DEMO123" (uppercase). The password hint `demo123` should be lowercase.

**Root cause:** `client/src/pages/Login.jsx` line ~261:
```jsx
<p style={{ ..., textTransform: 'uppercase', ... }}>
  Demo Quick Login — password: demo123
</p>
```
`textTransform: 'uppercase'` is on the parent `<p>` and uppercases the inline text "demo123".

**Fix:** Restructure into two `<span>` elements — one with uppercase for the label, one normal for the password:
```jsx
<p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.12em', textAlign: 'center', margin: '0 0 10px 0' }}>
  <span style={{ textTransform: 'uppercase' }}>Demo Quick Login — password: </span>
  <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>demo123</span>
</p>
```

---

### BUG-03 — Dev OTP Banner Visible in Production (HIGH)
**Status: NOT FIXED**

**What:** On the OTP screen, a yellow banner shows the OTP in plaintext and says "Dev Mode — SMTP not configured". This is visible in production.

**Root cause:** `client/src/pages/Login.jsx` line ~307:
```jsx
{devOtp && (
  <div>⚠️ Dev Mode — SMTP not configured. Your OTP is: {devOtp}</div>
)}
```
This renders whenever `devOtp` is truthy, with no dev-environment check.

**Fix 1 — Client (Login.jsx):** Guard with `import.meta.env.DEV`:
```jsx
{import.meta.env.DEV && devOtp && (
  <div style={{ ... }}>
    ⚠️ Dev Mode — SMTP not configured. Your OTP is: {devOtp}
  </div>
)}
```

**Fix 2 — Server (server/routes/auth.js):** Only return `devOtp` in the response when not in production:
Find the OTP generation/response in `auth.js` and wrap the devOtp field:
```js
// Only include devOtp outside production
...(process.env.NODE_ENV !== 'production' && { devOtp: generatedOtp }),
```
Apply the same to the resend-login-otp endpoint.

---

### BUG-04 — Raise Complaint Form: Silent Failure When Domain Not Selected (HIGH)
**Status: PARTIALLY FIXED** — toast exists, but red border highlight is missing

**What:** If the user submits without selecting a domain, a toast error appears ("Please select a domain") but the domain buttons section has no visual highlight to show WHAT is missing.

**Current state** in `client/src/pages/RaiseComplaint.jsx`:
```jsx
if (!domain) return toast.error('Please select a domain')
```
Toast exists. Red border does NOT exist.

**Fix:** Add `domainError` state and red border to the domain section:
1. Add `const [domainError, setDomainError] = useState(false)` to state declarations
2. In `handleSubmit`, replace the existing domain check with:
```jsx
if (!domain) {
  setDomainError(true)
  toast.error('Please select a category for your complaint')
  document.querySelector('[data-section="domain"]')?.scrollIntoView({ behavior: 'smooth' })
  return
}
setDomainError(false)
```
3. Wrap the domain buttons div with `data-section="domain"` and conditional border:
```jsx
<div
  data-section="domain"
  style={{ ..., border: domainError ? '2px solid #DC2626' : '2px solid transparent', borderRadius: 12 }}
>
  {/* existing domain buttons */}
</div>
```
4. Call `setDomainError(false)` when any domain button is clicked.

---

### BUG-05 — "Complaint Not Found" Immediately After Successful Submission (CRITICAL)
**Status: NOT FIXED** — needs investigation + fix

**What:** After a complaint is successfully submitted (confirmation shows VOX-0026), clicking "Complaint Details" navigates to `/complaints/{uuid}` and shows "Complaint not found" + "Failed to load complaint details" toast. The complaint IS in the DB (visible in dashboard list).

**Where to look:** `server/routes/complaints.js` — the `GET /api/complaints/:id` route. Also `client/src/pages/ComplaintDetail.jsx`.

**Likely cause:** The RLS policies or query filters on the single-complaint endpoint may be preventing students from viewing newly `raised` complaints. Check:
1. If the `.eq('id', id)` query in the GET /:id route is succeeding but some join is failing with an RLS error
2. Whether `complaint_access_log` insert is throwing an error that crashes the response
3. Whether there's a `description_unlocked_for` null check that errors for council_member role when the complaint hasn't been assigned yet

**Fix approach:** Add try/catch around the access log insert, and ensure the route returns the complaint even if supplementary queries fail. Also ensure students can always fetch their own complaint regardless of assigned_council_member_id being null.

Specifically in `GET /api/complaints/:id`, after the main query, look for any code that might fail when `assigned_council_member_id` is null or when `description_unlocked_for` is null, and add null guards.

---

### BUG-06 — Language Toggle Shows Wrong Label (LOW)
**Status: FIXED** ✅ — Already fixed by Kilo in previous session

---

## After Fixing

1. Commit all changes with message: `fix: resolve QA bugs 01-05 (viewport dead zone, demo password, dev OTP banner, domain validation, complaint detail 404)`
2. Push to `origin/main`
3. Confirm Vercel + Railway deployments are healthy
4. Report back here so Claude can run another QA pass and check if new bugs have appeared

---

## Repeat Cycle

This is a loop:
1. Kilo reads this file → fixes all open bugs → commits + pushes
2. Claude does live QA at https://vox-dpsi.vercel.app → finds new bugs → adds them to `BUG_FIXES_REQUIRED.md`
3. Kilo reads the file again → fixes new bugs → commits + pushes
4. Repeat until there are no more bugs

**The app must be flawless for a demo to the Principal of DPS Indore.**
