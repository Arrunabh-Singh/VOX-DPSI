# Vox DPSI — Bug Fixes Required
**QA conducted:** May 9, 2026 | **Tester:** Claude (Cowork mode) via live Chrome session on https://vox-dpsi.vercel.app

---

## BUG-01 — Cream/Beige Dead Zone on All Pages (Layout)
**Severity:** HIGH  
**Status:** FIXED ✅ (commit 834374c)

`client/src/index.css`: changed `height: 100vh` → `min-height: 100vh; width: 100%` on `html, body, #root`.

---

## BUG-02 — "DEMO123" Shows in Uppercase on Login Page
**Severity:** MEDIUM  
**Status:** FIXED ✅ (commit 8187339)

`client/src/pages/Login.jsx`: split into two spans — uppercase label span + `textTransform: 'none'` password span.

---

## BUG-03 — "DEV MODE — SMTP NOT CONFIGURED" Banner Visible in Production
**Severity:** HIGH  
**Status:** FIXED ✅ (commits 8187339 + a62aa18)

- `client/src/pages/Login.jsx`: guarded with `import.meta.env.DEV &&`
- `server/routes/auth.js`: all devOtp returns guarded with `process.env.NODE_ENV !== 'production'`

---

## BUG-04 — Raise Complaint: Silent Failure When No Domain Selected
**Severity:** HIGH  
**Status:** FIXED ✅ (commit 8187339)

`client/src/pages/RaiseComplaint.jsx`: added `domainError` state, red border on domain grid, `scrollIntoView` on validation error.

---

## BUG-05 — "Complaint Not Found" Immediately After Successful Submission
**Severity:** CRITICAL  
**Status:** FIXED ✅ (commits 834374c + 36ba114)

`server/routes/complaints.js`:
- Removed `assigned_council_member_id` filter blocking student's own-complaint query
- Wrapped `complaint_access_log` insert in try/catch (non-fatal)
- Added optional chaining on all nullable join objects

---

## BUG-06 — Login Page: "View in English" Button Always Shown
**Severity:** LOW  
**Status:** FIXED ✅

---

## BUG-07 — Railway Server Crash: Null Bytes in server files (CRITICAL)
**Severity:** CRITICAL  
**Status:** FIXED ✅ (commits 863a565, 8dbc37a, 07a2650)

Multiple server files had null bytes (`\x00`) appended from interrupted file writes:
- `server/routes/complaints.js` — fixed in 863a565
- `server/package.json` (34 null bytes) — fixed in 07a2650
- `server/index.js` (2159 null bytes) — fixed in 07a2650
- `server/db/supabase.js` (18 null bytes) — fixed in 07a2650

All server files now pass `node --check` syntax verification.

---

## Summary Table

| # | Bug | Severity | Status | File(s) Changed |
|---|-----|----------|--------|-----------------|
| BUG-07 | NULL BYTES crash Railway server on startup | CRITICAL | FIXED ✅ | `server/index.js`, `server/package.json`, `server/db/supabase.js`, `server/routes/complaints.js` |
| BUG-05 | "Complaint not found" after successful submission | CRITICAL | FIXED ✅ | `server/routes/complaints.js` |
| BUG-01 | Cream dead zone — layout not filling viewport | HIGH | FIXED ✅ | `client/src/index.css` |
| BUG-03 | Dev OTP banner visible in production | HIGH | FIXED ✅ | `client/src/pages/Login.jsx`, `server/routes/auth.js` |
| BUG-04 | Silent form failure when domain not selected | HIGH | FIXED ✅ | `client/src/pages/RaiseComplaint.jsx` |
| BUG-02 | "DEMO123" uppercase — span fix not working | MEDIUM | FIXED ✅ | `client/src/pages/Login.jsx` |
| BUG-06 | "View in English" shown when already in English | LOW | FIXED ✅ | — |

**All 7 bugs fixed. Commit 07a2650 pushed to GitHub at 17:08 IST — Railway redeploy in progress.**

---

## Verify After Redeploy

1. Hit https://vox-dpsi-production-6d95.up.railway.app/health → must return `{"status":"ok"}`
2. Login as `5411@student.dpsindore.org` / `demo123` → OTP screen shows no yellow dev banner
3. Full-screen green background — no cream gaps anywhere
4. Raise complaint → click "Complaint Details" → detail page loads (not 404)
5. Login as `council@dpsi.com` → see complaint with "(Anon Req)" badge
6. Login as `principal@dpsi.com` → full dashboard with stats
7. Login as `supervisor@dpsi.com` → all-system view

*Last updated: 2026-05-09 17:08 IST by Claude (Cowork mode).*
