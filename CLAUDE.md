# CLAUDE.md — Vox DPSI Complete Handover Guide

> **Who wrote this:** Claude (Anthropic), built inside Cowork mode on the Claude desktop app,
> commissioned by Arrunabh Singh (arrunabh.s@gmail.com) for his DPS Indore Student Council
> Presidential interview. If you are a future developer — human or AI — read this top to bottom
> before touching anything.

---

## 1. What This Project Is

**Vox DPSI** is a live, production-grade web application — a student grievance management system
for Delhi Public School Indore. Think "Indore 311, but for school students."

- Students raise complaints by category (Academics, Infrastructure, Safety, Personal, Behaviour, Other)
- Council members handle and verify complaints in person
- Complex issues escalate up through Class Teacher → Coordinator → Principal
- Every action is logged with a permanent audit trail
- A built-in anonymity system lets students protect their identity when escalating to teachers

**Live URL:** https://vox-dpsi.vercel.app  
**GitHub:** https://github.com/Arrunabh-Singh/VOX-DPSI  
**Demo password (all accounts):** `demo123`

---

## 2. Project History — How It Was Built

This entire project was designed, coded, and deployed by Claude inside a single Cowork session
(April 18–19, 2026). The build happened in phases:

| Phase | What happened |
|-------|--------------|
| v1 Build | Claude wrote all 50+ files from scratch based on Arrunabh's spec |
| Credentials | Real Supabase project created, GitHub repo created, env vars set |
| Database | Schema + seed SQL run in Supabase SQL editor |
| Deployment | GitHub push via DEPLOY_NOW.bat; Vercel CLI deployed frontend |
| Railway | Backend deployed manually from railway.app → GitHub repo |
| Design Refresh | Claude Design tool (claude.ai/design) used to redesign UI: navy→green, frosted glass |
| Presentation | Standalone 11-slide HTML presentation built in Claude Design |

**Key decisions made during build:**
- Switched from navy `#003366` to DPS Indore's actual brand green `#1B4D2B`
- Gold changed from `#FFD700` to the richer `#C9920A` (matches school torch)
- Added frosted glass (`backdrop-filter: blur`) throughout
- Presentation uses `<deck-stage>` web component for keyboard navigation

---

## 3. Tech Stack

### Frontend (`client/`)
| Tool | Version | Purpose |
|------|---------|---------|
| React | 18 | UI framework |
| Vite | 5 | Build tool |
| Tailwind CSS | 3 | Utility-first CSS |
| React Router | 6 | Client-side routing |
| Axios | 1.x | HTTP client |
| react-hot-toast | 2.x | Toast notifications |

### Backend (`server/`)
| Tool | Purpose |
|------|---------|
| Node.js + Express | REST API server |
| `@supabase/supabase-js` | Database client (service role key) |
| `jsonwebtoken` | JWT auth tokens |
| `bcryptjs` | Password hashing |
| `multer` | File upload handling |
| `cors` | Cross-origin requests |

### Infrastructure
| Service | What it hosts |
|---------|--------------|
| **Vercel** | React frontend → https://vox-dpsi.vercel.app |
| **Railway** | Express backend → https://vox-dpsi-server.up.railway.app |
| **Supabase** | PostgreSQL database + file storage |

---

## 4. Environment Variables

### `server/.env` (DO NOT COMMIT — excluded by .gitignore)
```
PORT=5000
SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
JWT_SECRET=voxdpsi2026secretkeyforjwtauth
CLIENT_URL=https://vox-dpsi.vercel.app
```

### `client/.env` (DO NOT COMMIT — excluded by .gitignore)
```
VITE_API_URL=https://vox-dpsi-server.up.railway.app
VITE_SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

**Railway** has these server env vars set in its dashboard.  
**Vercel** has the client env vars set via the CLI deploy command.

> If you need to redeploy, see Section 9 (Deployment).

---

## 5. Database Schema

Four tables in Supabase (PostgreSQL):

### `users`
Stores all accounts. Roles enforced via CHECK constraint.
```sql
id          UUID PK
name        TEXT
email       TEXT UNIQUE
password_hash TEXT           -- bcryptjs, cost 12
role        TEXT             -- see Section 6 for roles
scholar_no  TEXT             -- students only (e.g. '5001')
section     TEXT             -- e.g. 'XII B'
house       TEXT             -- e.g. 'Prithvi'
created_at  TIMESTAMPTZ
```

### `complaints`
The core entity. `complaint_no` is a SERIAL used to generate VOX-XXXX display IDs.
```sql
id                   UUID PK
complaint_no         SERIAL UNIQUE     -- display as VOX-0001, VOX-0002…
student_id           UUID → users(id)
domain               TEXT              -- academics|infrastructure|safety|personal|behaviour|other
description          TEXT
is_anonymous_requested BOOLEAN DEFAULT false
identity_revealed    BOOLEAN DEFAULT false  -- set true if council reveals identity
attachment_url       TEXT              -- Supabase Storage public URL
status               TEXT DEFAULT 'raised'
assigned_council_member_id UUID → users(id)
supervisor_id        UUID → users(id)
current_handler_role TEXT DEFAULT 'council_member'
created_at           TIMESTAMPTZ
updated_at           TIMESTAMPTZ       -- auto-updated by trigger
```

### `complaint_timeline`
Immutable audit trail. Every action appends a row — nothing is ever deleted.
```sql
id               UUID PK
complaint_id     UUID → complaints(id)
action           TEXT           -- e.g. 'Complaint raised', 'Escalated to coordinator'
performed_by     UUID → users(id)
performed_by_role TEXT
note             TEXT           -- optional free-text field note
created_at       TIMESTAMPTZ
```

### `escalations`
Records each escalation event and the identity-reveal decision.
```sql
id               UUID PK
complaint_id     UUID → complaints(id)
escalated_by     UUID → users(id)
escalated_to_role TEXT
student_consent  BOOLEAN DEFAULT false  -- true = council revealed identity
reason           TEXT
created_at       TIMESTAMPTZ
```

---

## 6. Role System

Six roles, each with a distinct dashboard and set of permissions:

| Role | Email (demo) | Dashboard | What they see |
|------|-------------|-----------|---------------|
| `student` | 5001@student.dpsindore.org | StudentDashboard | Their own complaints only |
| `council_member` | 5002@student.dpsindore.org | CouncilDashboard | Assigned complaints; always sees real name |
| `supervisor` | 5411@student.dpsindore.org | SupervisorDashboard | All complaints, read-only monitoring |
| `class_teacher` | sharma@staff.dpsindore.org | TeacherDashboard | Escalated-to-teacher complaints |
| `coordinator` | kapil@staff.dpsindore.org | CoordinatorDashboard | All coordinator-level escalations |
| `principal` | principal@dpsindore.org | PrincipalDashboard | Full system view + CSV export |

All demo accounts use password `demo123`.

---

## 7. Anonymity System — Critical Logic

This is the most important feature. Read carefully before modifying anything related to
escalations or student identity.

**How it works:**

1. Student submits complaint with `is_anonymous_requested: true`
2. Council member dashboard **always** shows the real student name (they must verify in person)
3. When the council member clicks "Escalate":
   - If `is_anonymous_requested` is true → **EscalateModal** shows: *"This student requested anonymity. Reveal their identity to the next handler?"*
   - Council member picks YES or NO
   - YES → `identity_revealed = true` stored on the complaint; all future handlers see the name
   - NO → `identity_revealed = false`; teacher/coordinator/principal see "Anonymous Student"
4. The escalation decision is permanently logged in `complaint_timeline`
5. Principal and Supervisor always see full names regardless of `identity_revealed`

**Where this logic lives:**
- `server/routes/complaints.js` — PATCH `/escalate` endpoint; checks `reveal_identity` param
- `client/src/components/EscalateModal.jsx` — the UI modal with YES/NO buttons
- `client/src/pages/TeacherDashboard.jsx` — conditionally shows name based on `identity_revealed`
- `client/src/pages/CoordinatorDashboard.jsx` — same check
- `client/src/pages/PrincipalDashboard.jsx` — always shows name

---

## 8. File Structure

```
vox-dpsi/
├── CLAUDE.md                     ← you are here
├── README.md                     ← public-facing documentation
├── schema.sql                    ← run once in Supabase SQL editor
├── seed.sql                      ← run once after schema.sql
├── vercel.json                   ← Vercel build config (client only)
├── railway.json                  ← Railway deploy config (server only)
├── .gitignore                    ← excludes node_modules, .env files, dist/
│
├── client/                       ← React + Vite frontend
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js        ← color tokens: green #1B4D2B, gold #C9920A
│   ├── postcss.config.js
│   ├── public/
│   │   ├── dps-logo.png          ← DPS Indore logo (dark bg)
│   │   ├── dps-logo-light.webp   ← DPS Indore logo (light bg)
│   │   ├── dps-logo-color.png    ← color version uploaded by user
│   │   └── presentation/         ← Standalone HTML presentation
│   │       ├── index.html        ← 11-slide deck (open in browser)
│   │       ├── deck-stage.js     ← keyboard-navigable slide web component
│   │       └── assets/           ← logos used inside slides
│   └── src/
│       ├── App.jsx               ← routes + role-based routing
│       ├── main.jsx              ← React entry point
│       ├── index.css             ← Tailwind imports + glass utilities
│       ├── components/
│       │   ├── VoxLogo.jsx       ← SVG shield+mic mark + wordmark component
│       │   ├── Navbar.jsx        ← top nav with role badge
│       │   ├── ComplaintCard.jsx ← reusable complaint list card
│       │   ├── StatusPill.jsx    ← colour-coded status badge
│       │   ├── DomainBadge.jsx   ← domain icon + label badge
│       │   ├── Timeline.jsx      ← audit trail with timestamps
│       │   ├── EscalateModal.jsx ← anonymity decision modal (CRITICAL)
│       │   ├── FileUpload.jsx    ← Supabase Storage upload widget
│       │   └── LoadingSpinner.jsx
│       ├── pages/
│       │   ├── Login.jsx                   ← 6 demo quick-fill buttons
│       │   ├── StudentDashboard.jsx
│       │   ├── RaiseComplaint.jsx
│       │   ├── ComplaintDetail.jsx         ← timeline view
│       │   ├── CouncilDashboard.jsx        ← always shows real name
│       │   ├── TeacherDashboard.jsx        ← conditional name display
│       │   ├── CoordinatorDashboard.jsx
│       │   ├── PrincipalDashboard.jsx      ← full view + CSV export
│       │   ├── SupervisorDashboard.jsx
│       │   └── VicePrincipalDashboard.jsx
│       ├── context/
│       │   └── AuthContext.jsx   ← JWT storage, login/logout, user state
│       ├── hooks/
│       │   └── useComplaints.js  ← complaint fetching hook
│       └── utils/
│           ├── api.js            ← axios instance + JWT interceptor + 401 handler
│           ├── constants.js      ← DOMAINS, STATUSES, COLORS, ROLES maps
│           └── formatDate.js     ← formatIST(), timeAgo() utilities
│
└── server/                       ← Node.js + Express backend
    ├── index.js                  ← server entry, CORS, route mounts
    ├── package.json              ← "type": "module" (ES modules throughout)
    ├── Procfile                  ← Railway: "web: node index.js"
    ├── .env                      ← NEVER COMMITTED — set in Railway dashboard
    ├── db/
    │   └── supabase.js           ← createClient with SERVICE_KEY
    ├── middleware/
    │   ├── auth.js               ← verifyToken middleware (JWT decode)
    │   └── roleGuard.js          ← allowRoles(...roles) middleware factory
    ├── routes/
    │   ├── auth.js               ← POST /login, GET /me
    │   ├── complaints.js         ← full CRUD + status workflow + escalation
    │   ├── timeline.js           ← GET/POST complaint timeline
    │   ├── upload.js             ← POST /upload → Supabase Storage
    │   └── users.js              ← GET/POST users (admin only)
    └── utils/
        └── complaintNo.js        ← formats serial → 'VOX-0001'
```

---

## 9. Deployment

### Frontend (Vercel)
Vercel auto-deploys from GitHub on every push to `main`.
- Build command: `cd client && npm install && npm run build`
- Output dir: `client/dist`
- Env vars set via Vercel dashboard (not in code)

Manual redeploy:
```bash
cd vox-dpsi
npx vercel --prod
```

### Backend (Railway)
Railway deploys from GitHub automatically.
- Root dir: `/server`
- Start command: `node index.js`
- Env vars set in Railway dashboard → Variables tab

### Database (Supabase)
Schema is already deployed. To reset:
1. Go to https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql
2. Paste + run `schema.sql`
3. Paste + run `seed.sql`

---

## 10. Local Development

```bash
# 1. Install dependencies
cd vox-dpsi/server && npm install
cd ../client && npm install

# 2. Set up env files (copy from .env.example and fill in values)
cp server/.env.example server/.env
cp client/.env.example client/.env   # (create if missing)

# 3. Start backend
cd server && node index.js           # runs on :5000

# 4. Start frontend (separate terminal)
cd client && npm run dev             # runs on :5173

# 5. Open http://localhost:5173
```

---

## 11. Presentation

A standalone 11-slide HTML presentation lives at `client/public/presentation/index.html`.
Open it in any browser — no server needed.

**Navigation:**
- `→` or `Space` — next slide
- `←` — previous slide
- `R` — reset to first slide
- Number keys `1–9` — jump to slide

**Slides:**
1. Title — VOX DPSI wordmark, DPS logo, live URL, frosted glass info cards
2. The Problem — 6 frosted glass cards covering each gap
3. The Inspiration — Indore 311 origin story, Vox etymology
4. What is Vox DPSI? — bullet list + live Login screen mockup
5. The 6 Roles — icon cards for all stakeholders
6. Anonymity System — step-by-step flow with colour-coded decisions
7. Complaint Flow — 7-step pipeline diagram
8. App Screens — live HTML recreations of Student Dashboard + Complaint Detail
9. Technical Stack — full tech breakdown with live links
10. Why It Matters — closing argument cards
11. Closing Slide — URL + GitHub + name

Once deployed, the presentation is live at: **https://vox-dpsi.vercel.app/presentation/**

---

## 12. Known Issues & Notes

- `server/run_schema.mjs` — a one-off script used to test Supabase connectivity; excluded from git via `.gitignore`
- The Supabase anon key is safe to expose in frontend code — it's designed for public use
- The service role key in `server/.env` must never be committed — it has full database access
- Complaint numbers are formatted as `VOX-0001` (zero-padded 4 digits) — logic in `server/utils/complaintNo.js`
- All timestamps displayed in IST (UTC+5:30) using `formatIST()` from `utils/formatDate.js`
- `identity_revealed` defaults to `false`; only set to `true` when council explicitly confirms on escalation

---

## 13. Demo Quick Reference

| Role | Email | Password |
|------|-------|----------|
| Student | 5001@student.dpsindore.org | demo123 |
| Council | 5002@student.dpsindore.org | demo123 |
| Teacher | sharma@staff.dpsindore.org | demo123 |
| Coordinator | kapil@staff.dpsindore.org | demo123 |
| Principal | principal@dpsindore.org | demo123 |
| Supervisor | 5411@student.dpsindore.org | demo123 |

**3-minute demo flow:**
1. Student → raise complaint (Infrastructure, anonymous, optional attachment)
2. Council → see "Anon Requested" badge, verify, escalate (choose NO to hide identity)
3. Coordinator → see anonymous complaint, resolve or escalate
4. Principal → see full dashboard with stats and CSV export

---

*Built by Claude (Anthropic) · April 2026 · Vox DPSI v2.0*
