# Vox DPSI — Bug Fixes Required
**QA conducted:** May 9, 2026 | **Tester:** Claude (Cowork mode) via live Chrome session on https://vox-dpsi.vercel.app

---

## BUG-01 — Cream/Beige Dead Zone on All Pages (Layout)
**Severity:** HIGH — Visible on every single screen, embarrassing during demo  
**Status:** NOT FIXED — still visible on production

### What's happening
Every page has a large dead zone of cream/beige background:
- **Right side:** ~390px wide blank cream band from top to bottom of the browser window
- **Bottom:** ~280px of blank cream below the page footer

The green gradient background and all page content are confined to roughly the left 75% of the viewport.

### How to fix
In `client/src/index.css` line 24, change:
```css
html, body, #root { height: 100vh; background-color: #1a2e16; }
```
To:
```css
html, body, #root {
  min-height: 100vh;
  width: 100%;
  background-color: #1a2e16;
}
```

---

## BUG-02 — "DEMO123" Shows in Uppercase on Login Page
**Severity:** MEDIUM — Looks broken during demo, confuses users about the password  
**Status:** NOT FIXED — span fix not overriding correctly

### What's happening
The demo quick-login section shows: `DEMO QUICK LOGIN — PASSWORD: DEMO123`
The password hint `demo123` is being uppercased by an ancestor element's `text-transform: uppercase`.

### How to fix
In `client/src/pages/Login.jsx`, find the paragraph with the password hint and restructure:
```jsx
// Remove textTransform: 'uppercase' from the <p> element itself
// Use two <span> elements instead:
<p style={{ letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textAlign: 'center', margin: '0 0 10px 0' }}>
  <span style={{ textTransform: 'uppercase' }}>Demo Quick Login — password: </span>
  <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>demo123</span>
</p>
```

---

## BUG-03 — "DEV MODE — SMTP NOT CONFIGURED" Banner Visible in Production
**Severity:** HIGH — Exposes internal dev information to real users on the OTP screen  
**Status:** NOT FIXED

### What's happening
On the OTP verification screen, a yellow warning banner reads:
```
⚠️ DEV MODE — SMTP NOT CONFIGURED
Your OTP is: 4 5 4 6 3 5
```

### How to fix
**Fix 1 — client/src/pages/Login.jsx:** Guard the dev OTP banner:
```jsx
{import.meta.env.DEV && devOtp && (
  <div style={{ /* existing styles */ }}>
    ⚠️ Dev Mode — SMTP not configured. Your OTP is: {devOtp}
  </div>
)}
```

**Fix 2 — server/routes/auth.js:** Only return devOtp outside production:
```js
// In the login OTP response:
...(process.env.NODE_ENV !== 'production' && { devOtp: generatedOtp }),
```
Apply this to the resend-OTP endpoint too.

---

## BUG-04 — Raise Complaint Form: Silent Failure When Domain Not Selected
**Severity:** HIGH — Users have no idea why form won't submit  
**Status:** NOT FIXED (toast exists but no red border or scroll-to)

### What's happening
On the `/raise` page, if the user fills in the description but forgets to select a domain, the form fails silently. Toast error exists but no visual highlight on the domain section.

### How to fix
In `client/src/pages/RaiseComplaint.jsx`:
1. Add `const [domainError, setDomainError] = useState(false)`
2. In `handleSubmit`, replace the domain check:
```jsx
if (!domain) {
  setDomainError(true)
  toast.error('Please select a category for your complaint')
  document.querySelector('[data-section="domain"]')?.scrollIntoView({ behavior: 'smooth' })
  return
}
setDomainError(false)
```
3. Add `data-section="domain"` and red border to the domain buttons container:
```jsx
<div
  data-section="domain"
  style={{ border: domainError ? '2px solid #DC2626' : '2px solid transparent', borderRadius: 12 }}
>
  {/* domain buttons */}
</div>
```
4. Call `setDomainError(false)` when any domain button is clicked.

---

## BUG-05 — "Complaint Not Found" Immediately After Successful Submission
**Severity:** CRITICAL — Core user flow is broken  
**Status:** NOT FIXED

### What's happening
After submitting a complaint (confirmation shows "VOX-0026"), clicking "Complaint Details" shows "Complaint not found." The complaint IS in the DB (visible in dashboard list).

### How to fix
In `server/routes/complaints.js`, the `GET /api/complaints/:id` route — ensure student can always fetch their own complaint:
```js
if (req.user.role === 'student') {
  // Students can always see their own complaints regardless of status
  query = query.eq('student_id', req.user.id)
  // Do NOT add status filters here
}
```
Also add try/catch around any `complaint_access_log` inserts so a DB error there doesn't crash the complaint detail response.

---

## BUG-06 — Login Page: "View in English" Button Always Shown (Redundant When Already in English)
**Severity:** LOW  
**Status:** FIXED ✅

---

## BUG-07 — Railway Server Crash: Null Bytes in complaints.js (CRITICAL)
**Severity:** CRITICAL — Entire backend is down, all API calls return 502  
**Status:** NOT FIXED — must be fixed FIRST before anything else can be tested

### What's happening
The Railway backend returns "Application failed to respond" (502) on every request. Node.js throws `SyntaxError: Invalid or unexpected token` at startup and the process immediately crashes.

**Root cause:** `server/routes/complaints.js` has null bytes (`\x00`) appended after `export default router` at the very end of the file. These were left by a file write that was interrupted or truncated incorrectly.

Verified with:
```bash
node --check server/routes/complaints.js
# → SyntaxError: Invalid or unexpected token
cat -A server/routes/complaints.js | tail -5
# → shows ^@ (null bytes) after the last line
```

### How to fix
Run this from the repo root and push:
```bash
python3 -c "
with open('server/routes/complaints.js', 'rb') as f:
    content = f.read()
clean = content.replace(b'\x00', b'').rstrip() + b'\n'
with open('server/routes/complaints.js', 'wb') as f:
    f.write(clean)
print('done')
"
node --check server/routes/complaints.js && echo "OK"
git add server/routes/complaints.js
git commit -m "fix: remove null bytes from complaints.js that crashed Railway server"
git push origin main
```

**This is the top priority. Nothing else can be tested until the backend is running.**

---

## Summary Table

| # | Bug | Severity | Status | File(s) to Change |
|---|-----|----------|--------|-------------------|
| BUG-07 | **NULL BYTES crash Railway server on startup** | CRITICAL | NOT FIXED | `server/routes/complaints.js` |
| BUG-05 | "Complaint not found" after successful submission | CRITICAL | NOT FIXED | `server/routes/complaints.js` |
| BUG-01 | Cream dead zone — layout not filling viewport | HIGH | NOT FIXED | `client/src/index.css` |
| BUG-03 | Dev OTP banner visible in production | HIGH | NOT FIXED | `client/src/pages/Login.jsx`, `server/routes/auth.js` |
| BUG-04 | Silent form failure when domain not selected | HIGH | NOT FIXED | `client/src/pages/RaiseComplaint.jsx` |
| BUG-02 | "DEMO123" uppercase — span fix not working | MEDIUM | NOT FIXED | `client/src/pages/Login.jsx` |
| BUG-06 | "View in English" shown when already in English | LOW | FIXED ✅ | — |

**Fix BUG-07 first, then BUG-01 through BUG-05 in any order.**

---

*Last updated: 2026-05-09 by Claude QA pass.*
