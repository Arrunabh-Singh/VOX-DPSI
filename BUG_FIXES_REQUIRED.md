# Vox DPSI — Bug Fixes Required
**QA conducted:** May 9, 2026 | **Tester:** Claude (Cowork mode) via live Chrome session on https://vox-dpsi.vercel.app

---

## BUG-01 — Cream/Beige Dead Zone on All Pages (Layout)
**Severity:** HIGH — Visible on every single screen, embarrassing during demo  
**Status:** REGRESSION — task #93 was marked completed but it is still broken on production

### What's happening
Every page has a large dead zone of cream/beige background:
- **Right side:** ~390px wide blank cream band from top to bottom of the browser window
- **Bottom:** ~280px of blank cream below the page footer
The green gradient background and all page content are confined to roughly the left 75% of the viewport. The right 25% and the area below the footer are an empty cream colour.

### Where to look
`client/src/index.css` or `client/src/App.jsx` — the root container is not using `min-h-screen` + `w-full` correctly. The body or root `<div>` likely has a max-width or a fixed width that doesn't cover the full viewport.

Also check `client/index.html` — the `<html>` and `<body>` tags need:
```css
html, body, #root {
  min-height: 100vh;
  width: 100%;
  margin: 0;
  padding: 0;
}
```

### How to fix
In `client/src/index.css`, ensure:
```css
html, body {
  min-height: 100vh;
  width: 100%;
  background: #2d5c26; /* DPS green to fill any gaps */
}
#root {
  min-height: 100vh;
  width: 100%;
}
```

Also check the Login page wrapper — it uses a gradient background but the outer shell does not stretch to fill the viewport. The login page background div should be `min-h-screen w-full`.

---

## BUG-02 — "DEMO123" Shows in Uppercase on Login Page
**Severity:** MEDIUM — Looks broken during demo, confuses users about the password  
**Status:** REGRESSION — task #96 was marked completed, the span fix was not effective

### What's happening
The demo quick-login section shows: `DEMO QUICK LOGIN — PASSWORD: DEMO123`  
The password hint `demo123` is being uppercased by an ancestor element's `text-transform: uppercase` CSS. The span wrapper fix from a previous session either wasn't deployed or the CSS specificity isn't high enough.

### Where to look
`client/src/pages/Login.jsx` — find the demo section header text. The fix is a `<span>` wrapper that was added but isn't overriding the uppercase correctly.

### How to fix
In `Login.jsx`, find the paragraph that contains the password hint and apply inline style with `!important` equivalent, or restructure the element outside the uppercase container:

```jsx
// Find this (or similar):
<p style={{ textTransform: 'uppercase', letterSpacing: '0.1em', ... }}>
  Demo Quick Login — password: <span style={{ textTransform: 'none', letterSpacing: 0 }}>demo123</span>
</p>

// The span fix doesn't work because CSS specificity. Change to:
<p style={{ letterSpacing: '0.1em', ... }}>
  <span style={{ textTransform: 'uppercase' }}>Demo Quick Login — password: </span>
  <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 'bold' }}>demo123</span>
</p>
```

Alternatively, just use two separate elements — one uppercase for the label, one normal for the password.

---

## BUG-03 — "DEV MODE — SMTP NOT CONFIGURED" Banner Visible in Production
**Severity:** HIGH — Exposes internal dev information to real users on the OTP screen  
**Status:** New bug

### What's happening
On the OTP verification screen (shown after entering email+password), there is a yellow warning banner that reads:
```
⚠️ DEV MODE — SMTP NOT CONFIGURED
Your OTP is: 4 5 4 6 3 5
```
This banner reveals the OTP in plaintext AND tells users that the server is in dev mode. In production this banner should NOT appear at all — the OTP should be delivered via email, and if email is not configured, the app should fail with a proper setup error rather than showing the OTP on screen.

### Where to look
`client/src/pages/Login.jsx` (or wherever the OTP screen component is rendered) — the dev-mode OTP display logic.  
Also `server/routes/auth.js` — the OTP generation endpoint likely returns the OTP in the response body when SMTP is not configured.

### How to fix
**Option A (recommended for demo):** Configure SMTP properly on Railway. Set the `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` env vars in the Railway dashboard to a working Gmail account with an App Password. This removes the dev banner automatically.

**Option B (code fix):** In the OTP screen component, only show the dev OTP banner when `import.meta.env.DEV === true` (i.e. local development only):
```jsx
{import.meta.env.DEV && devOtp && (
  <div className="dev-otp-banner">
    ⚠️ DEV MODE — Your OTP is: {devOtp}
  </div>
)}
```

In `server/routes/auth.js`, only return `devOtp` in the response when `process.env.NODE_ENV !== 'production'`.

---

## BUG-04 — Raise Complaint Form: Silent Failure When Domain Not Selected
**Severity:** HIGH — Critical UX bug, users have no idea why form won't submit  
**Status:** New bug

### What's happening
On the `/raise` page, if the user fills in the description but forgets to select a domain (the category buttons at the top), clicking "Submit Complaint" does nothing — the form stays on the page with no error message, no toast notification, no scroll-to-field, no field highlight. The user has zero feedback about what went wrong.

Tested: typed a 188-character description, clicked Submit — page silently stayed without any visual feedback or error.

### Where to look
`client/src/pages/RaiseComplaint.jsx` — the `handleSubmit` function. The form validation for the `domain` field is either:
a) Not implemented
b) Implemented but the error state is not being shown visually

### How to fix
In `RaiseComplaint.jsx`, add explicit validation in `handleSubmit` before the API call:

```jsx
const handleSubmit = async (e) => {
  e.preventDefault()
  
  // Validate domain
  if (!domain) {
    toast.error('Please select a category for your complaint')
    // Scroll to the domain section
    document.querySelector('[data-section="domain"]')?.scrollIntoView({ behavior: 'smooth' })
    setDomainError(true) // highlight the domain buttons section with a red border
    return
  }
  
  // ... rest of submit logic
}
```

Also add a red border state to the domain selector section when `domainError` is true:
```jsx
<div 
  data-section="domain"
  style={{ border: domainError ? '2px solid #DC2626' : 'none', borderRadius: 8 }}
>
  {/* domain buttons */}
</div>
```

---

## BUG-05 — "Complaint Not Found" Immediately After Successful Submission
**Severity:** CRITICAL — Core user flow is broken; student submits complaint and immediately gets an error  
**Status:** New bug

### What's happening
After a complaint is successfully submitted (confirmation screen shows "We heard you. VOX-0026"), clicking the "Complaint Details" button navigates to `/complaints/{uuid}` and shows:
- Page content: `"Complaint not found."`
- Toast notification: `"Failed to load complaint details"`

The complaint WAS created (it appears correctly in the dashboard list), but the detail page cannot load it via the UUID.

**Likely root cause:** The complaint detail API endpoint (`GET /api/complaints/:id`) is filtering out complaints that have no `assigned_council_member_id` (status `raised` with no assignment) or is requiring a field that a newly created complaint doesn't have yet.

Alternatively, the new Kilo-added "status filter" (added in this session to exclude `deleted` complaints) may have an off-by-one or incorrect filter that is also excluding `raised` complaints.

### Where to look
1. `server/routes/complaints.js` — the `GET /api/complaints/:id` route. Check what query conditions are applied. Specifically look for any `.neq('status', 'deleted')` or status-based filters that might be incorrectly excluding `raised` complaints.
2. Check if there's a role-based filter that prevents students from viewing their own complaint immediately after creation.

### How to fix
In `server/routes/complaints.js`, the GET single complaint route should:
1. Allow the student who created it (`student_id = req.user.id`) to view any of their own complaints regardless of status
2. NOT filter out `raised` complaints for the owning student

```js
// Ensure student can always see their own complaints:
const query = supabase.from('complaints').select('*').eq('id', id)

if (req.user.role === 'student') {
  query.eq('student_id', req.user.id) // student sees own complaints only
  // Do NOT add status filter here — students should see all their complaints including 'raised'
}
```

Also check `client/src/pages/ComplaintDetail.jsx` — if it navigates immediately after submit but the backend has any latency before the record is queryable, add a small retry or optimistic display.

---

## BUG-06 — Login Page: "View in English" Button Always Shown (Redundant When Already in English)
**Severity:** LOW — Minor UX confusion  
**Status:** New bug

### What's happening
On the login page, there is a button labelled "View in English" even when the app is already displaying in English. This is confusing and suggests the toggle isn't tracking the current language state properly on the login page.

### Where to look
`client/src/pages/Login.jsx` — the language toggle button. It should show either "हिंदी में देखें" (when in English) or "View in English" (when in Hindi), not always show "View in English".

### How to fix
```jsx
const { lang, toggleLang } = useLanguage()

<button onClick={toggleLang}>
  {lang === 'en' ? 'हिंदी में देखें' : 'View in English'}
</button>
```

---

## Summary Table

| # | Bug | Severity | File(s) to Change |
|---|-----|----------|-------------------|
| BUG-01 | Cream dead zone — layout not filling viewport | HIGH | `client/src/index.css`, `client/src/App.jsx` |
| BUG-02 | "DEMO123" uppercase — span fix not working | MEDIUM | `client/src/pages/Login.jsx` |
| BUG-03 | Dev OTP banner visible in production | HIGH | `client/src/pages/Login.jsx`, `server/routes/auth.js` |
| BUG-04 | Silent form failure when domain not selected | HIGH | `client/src/pages/RaiseComplaint.jsx` |
| BUG-05 | "Complaint not found" after successful submission | CRITICAL | `server/routes/complaints.js` |
| BUG-06 | "View in English" shown when already in English | LOW | `client/src/pages/Login.jsx` |

---

*Last updated: 2026-05-09 by Claude QA pass. Add new bugs below this line as they are found.*
