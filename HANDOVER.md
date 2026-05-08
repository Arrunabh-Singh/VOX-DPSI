# HANDOVER.md — Vox DPSI Project Brief for New Claude Code Instance

> **Read this entire file before touching anything.**
> The full technical reference is in CLAUDE.md (876 lines). Read that too.
> This handover was written on May 8, 2026.

---

## Who You Are Working For

**Arrunabh Singh** (arrunabh.s@gmail.com) — School President candidate, DPS Indore.
He is a student, not a developer. The app is being presented to the school principal
as part of a student council presidential interview. It must look and work flawlessly.

---

## The Project

**Vox DPSI** — A student grievance management system for Delhi Public School Indore.
Students raise complaints → council members handle them → complex cases escalate through
Class Teacher → Coordinator → Principal.

- **Live Frontend:** https://vox-dpsi.vercel.app
- **Backend API:** https://vox-dpsi-production-6d95.up.railway.app
- **GitHub:** https://github.com/Arrunabh-Singh/VOX-DPSI (auto-deploys to Vercel + Railway on push)
- **Supabase project ID:** `gznhziptmydkalsrazpj`
- **Demo password (all accounts):** `demo123`

---

## FIRST THING TO DO

The Railway backend may be down. Check it first:

```
GET https://vox-dpsi-production-6d95.up.railway.app/health
```

Should return: `{"status":"ok"}`. If it doesn't:
1. Go to https://railway.app → your project → VOX-DPSI service
2. Check if it crashed (look at deployment logs)
3. Redeploy if needed — the latest code on GitHub is correct and builds fine

---

## Tech Stack

| Layer | Tech | Host |
|-------|------|------|
| Frontend | React 18 + Vite 5 + Tailwind CSS | Vercel |
| Backend | Node.js + Express (ES modules `"type":"module"`) | Railway |
| Database | Supabase (PostgreSQL) | Supabase |
| Auth | JWT via HttpOnly cookie | self |
| Storage | Supabase Storage (private + signed URLs) | Supabase |
| Email | Nodemailer (SMTP) | Railway |
| Cron jobs | node-cron (inside Railway process) | Railway |

**Brand colours:** Primary `#2d5c26` (forest green), Gold `#c9a84c`, Background `#F5F7FA`

---

## Current State (as of May 8, 2026)

### ✅ Completed (91 tasks):
- Full complaint lifecycle: raise → verify → in_progress → escalate → resolve → close → reopen
- 8-role RBAC: student, council_member, class_teacher, coordinator, principal, supervisor, vice_principal, board_member
- Anonymity system (council always sees real name; reveals on escalation only if they choose)
- POSH/POCSO keyword auto-triage → routes to coordinator + IC members
- Hindi/English multilingual toggle
- Rich text editor + markdown rendering
- Analytics dashboard (FCR, CSAT, SLA breach, heatmap, response time histogram)
- Role-based delegation (council member delegates to peer while absent)
- Consensus voting (council members vote on sensitive complaints)
- Audit log viewer, meeting agenda generator, term-limit tracking
- Email + in-app notifications
- **Task #28: Daily Digest** — cron job emails handlers a morning summary at 07:30 IST
- DPDP Act compliance: VPC flow, erasure requests, privacy notice gate
- Session timeout, data retention, PII masking in exports
- PWA manifest, quick exit button, auto-save drafts, complaint merging, bulk actions

### 🔴 CRITICAL: 3 Pending Database Migrations (NOT run yet)
These SQL files exist in the repo root but **have NOT been applied to Supabase yet**.
The delegation, consensus, and term-limit UI features won't work without them.

Run them at: https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql

1. `migration_delegation.sql` → adds `delegation_rules` table
2. `migration_consensus.sql` → adds `complaint_votes` table + consensus columns on `complaints`
3. `migration_term_limits.sql` → adds `term_start`, `term_end`, `term_role` to `users`

### 📋 Pending Tasks (prioritised for demo):
1. **#66 Uptime monitoring** — 5 min setup on UptimeRobot, makes it look professional
2. **#34 Knowledge Base / FAQ** — searchable help for students before filing
3. **#63 Guardian/parent role** — code + migration already in repo (`migration_guardian_role.sql`)
4. **#29 DPDP compliance audit** — document, not code
5. **#27 WhatsApp** — Twilio sandbox wired; needs production BSP upgrade
6. **#37-40 Smart assignment** — skills-based routing, load balancing, round-robin
7. **#65 Staging environment** — second Vercel + Railway + Supabase branch

---

## Auth Pattern (DO NOT BREAK)

Auth uses **HttpOnly cookies** (NOT localStorage). Migrated in task #51 to prevent XSS.

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

### Railway (server — set in Railway dashboard → Variables)
```
PORT=5000
SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co
SUPABASE_SERVICE_KEY=<service_role key from Supabase Settings → API>
JWT_SECRET=<min 32 char string>
CLIENT_URL=https://vox-dpsi.vercel.app
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM
ADMIN_WHATSAPP_NUMBER=+916268549591
```

### Vercel (client — set in Vercel dashboard → Settings → Environment Variables)
```
VITE_API_URL=https://vox-dpsi-production-6d95.up.railway.app
VITE_SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key from Supabase Settings → API>
```

---

## Repository Layout

```
vox-dpsi/
├── CLAUDE.md          ← Full technical reference (876 lines) — READ THIS
├── HANDOVER.md        ← This file
├── client/            ← React frontend
│   └── src/
│       ├── App.jsx           route tree + role guards
│       ├── components/       33 components
│       ├── pages/            11 page components
│       ├── context/          AuthContext.jsx + LanguageContext.jsx
│       ├── hooks/            useComplaints.js + useSessionTimeout.js
│       └── utils/            api.js (axios) + constants.js + translations.js
└── server/            ← Express backend
    ├── index.js        app entry + cron job starts
    ├── routes/         13 route files
    ├── services/       email.js, notifications.js, whatsapp.js
    ├── jobs/           autoEscalate.js (4 cron jobs including daily digest)
    ├── middleware/     auth.js + roleGuard.js
    └── db/             supabase.js
```

---

## Key Files

| File | Why it matters |
|------|---------------|
| `server/routes/complaints.js` | Largest file; all complaint operations |
| `client/src/components/EscalateModal.jsx` | Anonymity decision modal — most critical UX |
| `client/src/context/AuthContext.jsx` | Cookie-based session management |
| `client/src/utils/api.js` | Axios instance — must always have `withCredentials: true` |
| `server/jobs/autoEscalate.js` | 4 cron jobs: auto-escalate, SLA alert, follow-up reminder, daily digest, retention, term-expiry |
| `server/utils/keywords.js` | POSH/POCSO keyword arrays for auto-triage |
| `client/src/utils/constants.js` | Single source of truth for domains, statuses, colours |

---

## How to Build and Push

```bash
# Build check (from client/ directory)
cd client && npx vite build --outDir /tmp/build-check

# Push to GitHub (auto-triggers Vercel + Railway deploys)
# IMPORTANT: push from /tmp/vox-fresh NOT the mounted workspace
cd /tmp/vox-fresh
rsync -a --exclude='.git' --exclude='node_modules' --exclude='dist' \
  "/path/to/workspace/vox-dpsi/" /tmp/vox-fresh/
git add -A && git commit -m "your message" && git push origin main
```

**Why /tmp/vox-fresh?** The original .git was corrupted and unremovable (permission issue
on the mounted drive). A fresh git repo was created in /tmp/vox-fresh and force-pushed.
All subsequent pushes go from there.

**Railway root directory** must be set to `server/` in Railway dashboard → Settings → Source.

---

## Demo Flow (3 minutes for the principal)

1. Login as student → raise complaint (Infrastructure, attach image, request anonymity)
2. Login as council_member → see complaint assigned, name + anonymous badge
3. Mark verified → in progress → escalate (choose to hide identity)
4. Login as coordinator → see escalated complaint, anonymous student
5. Login as principal → full dashboard with stats
6. Login as supervisor → full system overview

---

*Handed over from Claude (Anthropic) via Cowork mode, May 8, 2026.*
*App built, deployed, and functional. Railway backend may need a restart — check /health first.*
