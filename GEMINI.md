# GEMINI.md — Vox DPSI Handover Brief for Gemini CLI

> You are picking up an active production project mid-development.
> Read this entire file before touching anything.
> The full technical reference is in CLAUDE.md — read that too.

---

## Who You Are Working For

**Arrunabh Singh** (arrunabh.s@gmail.com) — School President candidate, DPS Indore.
He is a student, not a developer. Explain things clearly. He wants the app to work perfectly
for his interview presentation to the school principal.

**Admin WhatsApp:** +916268549591

---

## The Project

**Vox DPSI** — A student grievance management system for Delhi Public School Indore.
Think "Indore 311 for school students." Students raise complaints, council members handle them,
complex cases escalate through Class Teacher → Coordinator → Principal.

- **Live URL:** https://vox-dpsi.vercel.app
- **Backend:** https://vox-dpsi-production-6d95.up.railway.app
- **GitHub:** https://github.com/Arrunabh-Singh/VOX-DPSI (auto-deploys to both Vercel + Railway on push)
- **Supabase:** project ID `gznhziptmydkalsrazpj`
- **Demo password (all accounts):** `demo123`

---

## Tech Stack

| Layer | Tech | Host |
|-------|------|------|
| Frontend | React 18 + Vite 5 + Tailwind CSS | Vercel |
| Backend | Node.js + Express (ES modules) | Railway |
| Database | Supabase (PostgreSQL) | Supabase |
| Auth | JWT via HttpOnly cookie | self |
| Storage | Supabase Storage (private + signed URLs) | Supabase |
| Email | Nodemailer | SMTP |
| Cron jobs | node-cron (inside Railway process) | Railway |

**Brand colours:** Primary `#2d5c26` (green), Gold `#c9a84c`, Background `#F5F7FA`

---

## Current State (as of May 5, 2026)

### What's built and working (90 tasks completed):
- Full complaint lifecycle: raise → verify → in_progress → escalate → resolve → close → reopen
- 8-role RBAC: student, council_member, class_teacher, coordinator, principal, supervisor, vice_principal, board_member
- Anonymity system (council always sees real name; reveals on escalation only if they choose to)
- POSH/POCSO keyword triage (auto-routes to coordinator + IC members)
- Hindi/English multilingual toggle
- Rich text editor + markdown rendering in complaints
- Analytics dashboard (FCR, CSAT, SLA breach, heatmap, response time histogram)
- Role-based delegation (council member can delegate to a peer while absent)
- Consensus voting (council members vote on sensitive behaviour/personal complaints)
- Audit log viewer, meeting agenda generator, term-limit tracking
- Email + in-app notifications
- DPDP Act compliance: VPC flow, erasure requests, privacy notice gate
- Session timeout, data retention, PII masking in exports
- PWA manifest, quick exit button, auto-save drafts, complaint merging, bulk actions

### What's pending (prioritised list):
1. **#29 DPDP compliance audit** — schema done, formal review not written
2. **#61 Breach notification plan** — incident response playbook document needed
3. **#63 Guardian/parent role** — read-only complaint view for parents
4. **#27 WhatsApp** — Twilio sandbox is wired up; needs production BSP upgrade
5. **#28 Daily digest** — morning summary email for handlers
6. **#37-40 Smart assignment** — skills-based routing, load balancing, round-robin
7. **#34 Knowledge base / FAQ** — searchable help for students
8. **#65 Staging environment** — second Vercel + Railway + Supabase branch
9. **#66 Uptime monitoring** — UptimeRobot

---

## CRITICAL: Pending Database Migrations

These 3 SQL files are in the repo root but **have NOT been run** in Supabase yet.
You MUST remind Arrunabh to run them (or run them via the Supabase MCP if connected):

1. `migration_delegation.sql` → adds `delegation_rules` table
2. `migration_consensus.sql` → adds `complaint_votes` table + consensus columns on `complaints`
3. `migration_term_limits.sql` → adds `term_start`, `term_end`, `term_role` to `users`

To apply: go to https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql → paste + run each file.

---

## Repository Layout

```
vox-dpsi/
├── CLAUDE.md          ← Full technical reference (876 lines) — READ THIS
├── GEMINI.md          ← This file
├── client/            ← React frontend
│   └── src/
│       ├── App.jsx           route tree + role guards
│       ├── components/       33 components
│       ├── pages/            11 page components
│       ├── context/AuthContext.jsx
│       ├── hooks/useComplaints.js
│       └── utils/api.js      axios + withCredentials + 401 interceptor
└── server/            ← Express backend
    ├── index.js        app entry + cron job starts
    ├── routes/         13 route files
    ├── services/       email.js, notifications.js, whatsapp.js
    ├── jobs/autoEscalate.js   3 cron jobs
    ├── middleware/auth.js + roleGuard.js
    └── db/supabase.js  createClient with SERVICE_KEY
```

---

## Auth Pattern (important — do not break this)

Auth uses **HttpOnly cookies** (not localStorage). This was migrated in task #51 to prevent XSS.

- Login sets `authToken` HttpOnly cookie on the response
- All axios requests use `withCredentials: true` (set globally in `client/src/utils/api.js`)
- Server reads `req.cookies.authToken` in `server/middleware/auth.js`
- CORS in `server/index.js` has `credentials: true` and specific origin (not `*`)

**Do not revert to localStorage or Authorization headers.**

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| student | student@dpsi.com | demo123 |
| council_member | council@dpsi.com | demo123 |
| class_teacher | teacher@dpsi.com | demo123 |
| coordinator | coordinator@dpsi.com | demo123 |
| principal | principal@dpsi.com | demo123 |
| supervisor | supervisor@dpsi.com | demo123 |

---

## Environment Variables

### Railway (server)
Set in Railway dashboard → your service → Variables:
```
PORT=5000
SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co
SUPABASE_SERVICE_KEY=<from Supabase → Settings → API → service_role>
JWT_SECRET=<min 32 char string>
CLIENT_URL=https://vox-dpsi.vercel.app
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM
ADMIN_WHATSAPP_NUMBER=+916268549591
```

### Vercel (client)
Set in Vercel dashboard → project → Settings → Environment Variables:
```
VITE_API_URL=https://vox-dpsi-production-6d95.up.railway.app
VITE_SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co
VITE_SUPABASE_ANON_KEY=<from Supabase → Settings → API → anon public>
```

---

## How to Build and Push

```bash
# Build check (from client/ directory)
npx vite build --outDir /tmp/build-check

# Push to GitHub (auto-triggers Vercel + Railway deploys)
git add -A
git commit -m "your message"
git push origin main
```

**Railway root directory** must be set to `server` in Railway dashboard → Settings → Source.
If it's blank, the `node index.js` start command won't find `index.js`.

---

## Key Files to Know

| File | Why it matters |
|------|---------------|
| `server/routes/complaints.js` | Largest file; all complaint operations including escalation, delegation check, consensus routes |
| `client/src/components/EscalateModal.jsx` | The anonymity decision modal — most critical UX moment |
| `client/src/context/AuthContext.jsx` | Cookie-based session management |
| `client/src/utils/api.js` | Axios instance — must always have `withCredentials: true` |
| `server/jobs/autoEscalate.js` | 3 cron jobs: SLA escalate, retention, term-expiry alerts |
| `server/utils/keywords.js` | POSH/POCSO keyword arrays for auto-triage |
| `client/src/utils/constants.js` | Single source of truth for domains, statuses, colours |

---

## What To Do Next

1. **Verify Railway deployed** — check https://vox-dpsi-production-6d95.up.railway.app/health returns `{"status":"ok"}`
2. **Run the 3 pending migrations** in Supabase SQL editor (listed above)
3. **Test login** at https://vox-dpsi.vercel.app with `student@dpsi.com` / `demo123`
4. **Next task to build:** Pick from the pending list above — #63 (Guardian/parent role) or #28 (Daily digest) are good next candidates

---

## Working Style Preferences

- Arrunabh is a student, not a developer. Keep explanations accessible.
- Always build then test: run `npx vite build` before pushing to GitHub.
- Always commit and push after completing a feature — Railway auto-deploys.
- Update this GEMINI.md with new completed features as you go.
- The app must look professional at all times — it's being presented to a school principal.

---

*Handed over from Claude (Anthropic) via Cowork mode, May 5, 2026.*
*Previous AI's full technical notes are in CLAUDE.md.*
