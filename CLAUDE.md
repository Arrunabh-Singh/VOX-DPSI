# CLAUDE.md — Vox DPSI Complete Handover Guide (v3 — May 2026)

> **This document is the single source of truth for any AI or developer continuing this project.**
> Read it top-to-bottom before touching any code. It supersedes all older versions.
>
> Built by Claude (Anthropic) inside Cowork mode, commissioned by Arrunabh Singh
> (arrunabh.s@gmail.com) — School President candidate, DPS Indore.

---

## 1. What This Project Is

**Vox DPSI** is a production-grade student grievance management system for Delhi Public School Indore.
Students raise complaints → council members handle them → complex cases escalate through
Class Teacher → Coordinator → Principal. Every action is permanently logged.

- **Live URL:** https://vox-dpsi.vercel.app
- **Backend:** https://vox-dpsi-production-6d95.up.railway.app
- **GitHub:** https://github.com/Arrunabh-Singh/VOX-DPSI
- **Supabase project:** gznhziptmydkalsrazpj
- **Demo password (all accounts):** `demo123`

---

## 2. Tech Stack

| Layer | Technology | Host |
|-------|-----------|------|
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 | Vercel |
| Backend | Node.js + Express (ES modules, `"type":"module"`) | Railway |
| Database | Supabase (PostgreSQL) | Supabase |
| Auth | JWT via HttpOnly cookie (cookie-parser) | self |
| File Storage | Supabase Storage (private bucket + signed URLs) | Supabase |
| Email | Nodemailer (SMTP config in server/.env) | any SMTP |
| WhatsApp | Twilio sandbox (not yet live — task #27 pending) | Twilio |
| Cron | node-cron (runs inside Railway process) | Railway |

**Brand colours:**
- Primary green: `#2d5c26` (used in supervisor/council dashboards — DPS green)
- Gold: `#c9a84c`
- Navy (original): `#003366` (legacy, being phased out to green)
- Background: `#F5F7FA`

---

## 3. Role System (8 roles)

| Role | Demo email | Dashboard | Key permission |
|------|-----------|-----------|----------------|
| `student` | student@dpsi.com | StudentDashboard | Own complaints only |
| `council_member` | council@dpsi.com | CouncilDashboard | Assigned complaints; always sees real name |
| `supervisor` | supervisor@dpsi.com | SupervisorDashboard | All complaints read-only + notes |
| `class_teacher` | teacher@dpsi.com | TeacherDashboard | Escalated-to-teacher complaints |
| `coordinator` | coordinator@dpsi.com | CoordinatorDashboard | All coordinator-level + can escalate to principal |
| `principal` | principal@dpsi.com | PrincipalDashboard | Full system view + CSV export |
| `vice_principal` | (none seeded) | VicePrincipalDashboard | Same access level as principal |
| `board_member` | (none seeded) | SupervisorDashboard | Read-only like supervisor |

All demo accounts use password `demo123`.

---

## 4. Database Schema (full, current)

### Core tables (from `schema.sql`)

#### `users`
```sql
id UUID PK DEFAULT gen_random_uuid()
name TEXT NOT NULL
email TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL
role TEXT CHECK (role IN ('student','council_member','class_teacher','coordinator',
  'principal','supervisor','vice_principal','board_member','external_ic_member'))
scholar_no TEXT                -- students only
section TEXT                   -- e.g. 'XII B'
house TEXT                     -- e.g. 'Prithvi'
phone TEXT                     -- for SMS/WhatsApp (optional)
created_at TIMESTAMPTZ DEFAULT now()
-- Added by migration_term_limits.sql:
term_start DATE               -- council/supervisor tenure start
term_end DATE                 -- council/supervisor tenure end
term_role TEXT                -- e.g. 'House Captain', 'School President'
-- Added by DPDP compliance:
is_privacy_acknowledged BOOLEAN DEFAULT false
privacy_acknowledged_at TIMESTAMPTZ
-- Added by VPC flow:
vpc_status TEXT               -- 'pending'|'approved'|'rejected'|null
vpc_parent_email TEXT
vpc_consent_token TEXT
vpc_consent_expires TIMESTAMPTZ
vpc_approved_at TIMESTAMPTZ
```

#### `complaints`
```sql
id UUID PK
complaint_no SERIAL UNIQUE       -- formatted as VOX-0001 by complaintNo.js
student_id UUID → users(id)
domain TEXT CHECK (domain IN ('academics','infrastructure','safety','personal','behaviour','other','posh_pocso'))
description TEXT NOT NULL
is_anonymous_requested BOOLEAN DEFAULT false
identity_revealed BOOLEAN DEFAULT false
attachment_url TEXT              -- Supabase Storage signed URL
status TEXT DEFAULT 'raised' CHECK (status IN (
  'raised','verified','in_progress','escalated_to_teacher',
  'escalated_to_coordinator','escalated_to_principal','resolved','closed','reopened'))
assigned_council_member_id UUID → users(id)
supervisor_id UUID → users(id)
current_handler_role TEXT DEFAULT 'council_member'
sla_deadline TIMESTAMPTZ         -- set on creation (72h default)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ           -- auto-updated by trigger
-- POSH/POCSO fields:
respondent_type TEXT             -- 'student'|'teaching_staff'|'non_teaching_staff'
ic_case_ref TEXT                 -- if routed to IC
-- Consensus fields (migration_consensus.sql):
consensus_required BOOLEAN DEFAULT false
consensus_status TEXT            -- 'voting'|'approved'|'rejected'|null
consensus_requested_by UUID → users(id)
consensus_requested_at TIMESTAMPTZ
consensus_resolution_note TEXT
-- Merge fields:
merged_into UUID → complaints(id)  -- if this complaint was merged
is_merged BOOLEAN DEFAULT false
-- Draft fields:
draft_data JSONB                 -- auto-save draft
-- Timestamp jitter (task #73):
display_created_at TIMESTAMPTZ   -- jittered timestamp shown to handlers
-- Reopen:
reopen_count INTEGER DEFAULT 0
last_reopened_at TIMESTAMPTZ
```

#### `complaint_timeline`
Immutable audit trail. Never delete rows.
```sql
id UUID PK
complaint_id UUID → complaints(id)
action TEXT NOT NULL
performed_by UUID → users(id)
performed_by_role TEXT
note TEXT
created_at TIMESTAMPTZ DEFAULT now()
```

#### `escalations`
```sql
id UUID PK
complaint_id UUID → complaints(id)
escalated_by UUID → users(id)
escalated_to_role TEXT NOT NULL
student_consent BOOLEAN DEFAULT false
reason TEXT
created_at TIMESTAMPTZ DEFAULT now()
```

### Extension tables (from migrations)

#### `notifications` (task #26)
```sql
id UUID PK
user_id UUID → users(id)
title TEXT
body TEXT
link TEXT                       -- e.g. '/complaints/abc-123'
is_read BOOLEAN DEFAULT false
created_at TIMESTAMPTZ
```

#### `complaint_access_log` (task #64)
```sql
id UUID PK
complaint_id UUID → complaints(id)
viewer_id UUID → users(id)
viewer_role TEXT
accessed_at TIMESTAMPTZ DEFAULT now()
ip_address TEXT                 -- for audit purposes
```

#### `audit_log` (task #22)
```sql
id UUID PK
actor_id UUID → users(id)
actor_role TEXT
action TEXT                     -- e.g. 'LOGIN', 'COMPLAINT_CREATED', 'STATUS_CHANGED'
entity_type TEXT                -- 'complaint'|'user'|'escalation' etc.
entity_id TEXT
details JSONB
ip_address TEXT
created_at TIMESTAMPTZ DEFAULT now()
```

#### `complaint_votes` (task #21 — from migration_consensus.sql)
```sql
id UUID PK
complaint_id UUID → complaints(id)
voter_id UUID → users(id)
vote TEXT CHECK (vote IN ('approve','reject'))
note TEXT
created_at TIMESTAMPTZ DEFAULT now()
UNIQUE (complaint_id, voter_id)  -- one vote per person per complaint
```

#### `delegation_rules` (task #20 — from migration_delegation.sql)
```sql
id UUID PK
delegator_id UUID → users(id)   -- council member handing off
delegate_id UUID → users(id)    -- person covering
start_date DATE NOT NULL
end_date DATE NOT NULL
reason TEXT
created_by UUID → users(id)
created_at TIMESTAMPTZ DEFAULT now()
CONSTRAINT no_self_delegation CHECK (delegator_id <> delegate_id)
CONSTRAINT valid_date_range CHECK (start_date <= end_date)
```

#### `workflow_templates` (task #8)
```sql
id UUID PK
name TEXT
domain TEXT                     -- which complaint domain this applies to
steps JSONB                     -- array of {role, action, deadline_hours}
created_by UUID → users(id)
created_at TIMESTAMPTZ
```

#### `resolution_templates` (task #36)
```sql
id UUID PK
title TEXT
body TEXT
domain TEXT
created_by UUID → users(id)
created_at TIMESTAMPTZ
```

#### `suggestions` (task #69 — pre-complaint dialogue)
```sql
id UUID PK
student_id UUID → users(id)     -- null if anonymous
message TEXT
is_anonymous BOOLEAN DEFAULT false
counselor_reply TEXT
replied_by UUID → users(id)
status TEXT DEFAULT 'open'      -- 'open'|'replied'|'closed'
created_at TIMESTAMPTZ
replied_at TIMESTAMPTZ
```

#### `erasure_requests` (task #60)
```sql
id UUID PK
user_id UUID → users(id)
role TEXT
reason TEXT
status TEXT DEFAULT 'pending'   -- 'pending'|'approved'|'rejected'
reviewer_note TEXT
reviewed_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

#### `complaint_appeals` (task #3 — reopen from closed)
```sql
id UUID PK
complaint_id UUID → complaints(id)
filed_by UUID → users(id)
reason TEXT
status TEXT DEFAULT 'pending'   -- 'pending'|'upheld'|'rejected'
reviewed_by UUID → users(id)
reviewer_note TEXT
reviewed_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

#### **Pending migrations (NOT YET RUN in Supabase):**
These SQL files exist in the repo root but must be manually run in the Supabase SQL editor:
- `migration_delegation.sql` — adds `delegation_rules` table
- `migration_consensus.sql` — adds `complaint_votes` table + consensus columns on `complaints`
- `migration_term_limits.sql` — adds `term_start`, `term_end`, `term_role` to `users`

---

## 5. Authentication (CRITICAL)

Auth uses **HttpOnly cookies** (not localStorage) to prevent XSS token theft (task #51).

**Flow:**
1. `POST /api/auth/login` → server verifies password, signs JWT, sets `authToken` cookie (HttpOnly, SameSite=Lax, Secure in prod)
2. All subsequent requests send the cookie automatically — no `Authorization` header needed
3. `GET /api/auth/me` → server reads cookie, decodes JWT, returns user object
4. `POST /api/auth/logout` → server clears cookie

**JWT payload:** `{ id, name, role, scholar_no, section, house, iat, exp }`
**JWT secret:** `JWT_SECRET` env var (set in Railway dashboard)
**Expiry:** 7 days

**`client/src/utils/api.js`** — axios instance with `withCredentials: true` on all requests and a 401 interceptor that redirects to `/login`.

**`server/middleware/auth.js`** — reads `req.cookies.authToken`, verifies, sets `req.user`.
**`server/middleware/roleGuard.js`** — `allowRoles(...roles)` middleware factory.

---

## 6. API Routes

### Auth (`server/routes/auth.js`)
```
POST /api/auth/register        — create account (no role guard — anyone can register)
POST /api/auth/login           — returns user object, sets HttpOnly cookie
GET  /api/auth/me              — returns current user from cookie
POST /api/auth/logout          — clears cookie
```

### Complaints (`server/routes/complaints.js`)
```
POST   /api/complaints                        — student raises complaint
GET    /api/complaints                        — role-filtered list
  ?status=, ?domain=, ?search=, ?page=, ?limit=
GET    /api/complaints/:id                    — detail (role-gated fields)
PATCH  /api/complaints/:id/status             — update status
PATCH  /api/complaints/:id/assign             — assign council member
PATCH  /api/complaints/:id/verify             — mark verified
PATCH  /api/complaints/:id/escalate           — escalate with reveal_identity choice
PATCH  /api/complaints/:id/resolve            — mark resolved
PATCH  /api/complaints/:id/close              — mark closed
PATCH  /api/complaints/:id/reopen             — student reopens within 7 days
PATCH  /api/complaints/:id/merge              — merge into another complaint
GET    /api/complaints/consensus-pending      — supervisor: all voting-status complaints
POST   /api/complaints/:id/request-consensus  — request group vote on sensitive case
POST   /api/complaints/:id/consensus-vote     — cast approve/reject vote
GET    /api/complaints/appeals                — principal: all appeals
PATCH  /api/complaints/appeals/:id/vote       — principal votes uphold/reject on appeal
```

### Timeline (`server/routes/timeline.js`)
```
GET  /api/complaints/:id/timeline  — full audit trail
POST /api/complaints/:id/timeline  — add note/action
```

### Notes (`server/routes/notes.js`)
```
GET  /api/complaints/:id/notes     — staff-only internal notes
POST /api/complaints/:id/notes     — add internal note
```

### Upload (`server/routes/upload.js`)
```
POST /api/upload    — multer → sharp (EXIF strip + resize) → Supabase Storage → signed URL
```

### Users (`server/routes/users.js`)
```
GET    /api/users               — list (principal/coordinator/supervisor only)
  ?role=council_member          — filter by role
POST   /api/users               — create user (principal/coordinator only)
PATCH  /api/users/me            — update own profile (house, section, phone)
PATCH  /api/users/:id/term      — update term dates (principal/coordinator only)
GET    /api/users/term-expiring  — users whose term ends in ≤30 days
GET    /api/users/erasure-requests — list erasure requests (coordinator/principal)
```

### Notifications (`server/routes/notifications.js`)
```
GET   /api/notifications        — current user's notifications
PATCH /api/notifications/:id/read — mark one as read
PATCH /api/notifications/read-all — mark all as read
```

### Suggestions (`server/routes/suggestions.js`)
```
POST /api/suggestions           — student posts anonymous suggestion
GET  /api/suggestions           — coordinator/counselor lists suggestions
PATCH /api/suggestions/:id/reply — counselor replies
```

### Audit Log (`server/routes/auditLog.js`)
```
GET /api/audit-log              — principal/supervisor only, paginated
  ?action=, ?actor=, ?from=, ?to=
```

### Workflow Templates (`server/routes/workflowTemplates.js`)
```
GET    /api/workflow-templates
POST   /api/workflow-templates  — coordinator/principal can create
PATCH  /api/workflow-templates/:id
DELETE /api/workflow-templates/:id
```

### Resolution Templates (`server/routes/resolutionTemplates.js`)
```
GET    /api/resolution-templates
POST   /api/resolution-templates
DELETE /api/resolution-templates/:id
```

### Delegations (`server/routes/delegations.js`)
```
GET    /api/delegations             — own delegations (council) or all (admin)
POST   /api/delegations             — create delegation with overlap guard
DELETE /api/delegations/:id         — cancel delegation
GET    /api/delegations/active-for-me — delegations where I am the delegate
```

### Health
```
GET /health          — { status: 'ok', ts: Date.now() }
GET /api/health      — same
GET /api/test-whatsapp — test Twilio WhatsApp sandbox (dev only)
```

---

## 7. Scheduled Jobs (`server/jobs/autoEscalate.js`)

All jobs run as `node-cron` schedules inside the Railway process:

| Job | Schedule | What it does |
|-----|----------|-------------|
| `startAutoEscalateCron` | Every 30 min | Escalates complaints that have breached SLA (72h default) with no action |
| `startRetentionCron` | 02:30 IST daily | Archives complaints older than 2 years (sets status=`closed`) |
| `startTermExpiryCron` | 08:00 IST daily | Sends in-app notification to principals for council members whose term ends in ≤30 days |

---

## 8. Key Patterns & Gotchas

### Anonymity system
- `is_anonymous_requested: true` = student wants privacy
- `identity_revealed: false` (default) = teachers/coordinators see "Anonymous Student"
- Council member **always** sees real name
- On escalation: `EscalateModal` asks "Reveal identity?" → sets `identity_revealed` if YES
- `server/routes/complaints.js` PATCH `/escalate` → writes `identity_revealed` to DB and logs to timeline
- Principal and Supervisor bypass the `identity_revealed` flag — always see full names

### HttpOnly cookie auth
- `withCredentials: true` is set globally on the axios instance in `client/src/utils/api.js`
- The CORS config in `server/index.js` must have `credentials: true` and a specific `origin` (not `*`)
- The `CLIENT_URL` env var must match the Vercel domain exactly

### Delegation (task #20)
- When `GET /api/complaints` is called as `council_member`, the server checks for active delegations:
  ```js
  // Fetches all complaints where assigned_council_member_id IN [myId, ...delegatorIds]
  ```
- Council member can also access individual complaint details if they are an active delegate for the complaint's assigned handler
- Delegations are date-range-based (`start_date <= today <= end_date`)

### Consensus voting (task #21)
- Only applies to `domain IN ('behaviour', 'personal')` for `council_member` role
- Instead of the Resolve button, they see `RequestConsensusButton`
- On request: `consensus_status = 'voting'`, requester's vote auto-cast as 'approve'
- Quorum = 2 approvals → complaint auto-advances to resolution
- `complaint_votes` table has `UNIQUE(complaint_id, voter_id)` → idempotent upserts

### POSH/POCSO keyword triage (task #49)
- `server/utils/keywords.js` exports `POSH_KEYWORDS` and `POCSO_KEYWORDS` arrays
- Checked in `POST /api/complaints` — if matched, domain is auto-set to `posh_pocso`
- `posh_pocso` complaints skip normal council_member routing and go straight to coordinator + IC members
- `respondent_type` field added to classify who the complaint is against

### PII masking for council_members (task #79)
- In complaint list views, council members see `domain + complaint_no` only until they explicitly open the complaint
- Student name shown only on the full detail view (after deliberate navigation)

### Timestamp jitter (task #73)
- Anonymous complaints get ±2 hours added to `display_created_at` to prevent correlation attacks
- Handlers see `display_created_at`, not `created_at`

### Password complexity (task #72)
- Enforced client-side in `RaiseComplaint.jsx` change-password flow
- Server-side check in `POST /api/auth/register`: min 8 chars, at least 1 upper, 1 number, 1 special

### VPC gate (task #59)
- `client/src/pages/VpcGate.jsx` — shown to new students at first login if `vpc_status !== 'approved'`
- Parent's email is captured, a consent token is emailed to the parent
- Parent clicks link → `VpcVerify.jsx` sets `vpc_status = 'approved'`
- `client/src/App.jsx` wraps student routes in a VPC check via `AuthContext`

### Privacy notice gate (task #62)
- `client/src/components/PrivacyNoticeGate.jsx` — modal shown to ALL users on first login
- Sets `is_privacy_acknowledged = true` via `PATCH /api/users/me`
- Once acknowledged, skipped on subsequent logins

---

## 9. Frontend Architecture

### `client/src/App.jsx`
Route tree with role-based guards. Pattern:
```jsx
<Route path="/dashboard" element={
  <RequireAuth allowedRoles={['student']}>
    <StudentDashboard />
  </RequireAuth>
} />
```
After login, role is checked and user is redirected to their role's dashboard.

### `client/src/context/AuthContext.jsx`
- Provides `user`, `login()`, `logout()`, `loading`
- On mount: calls `GET /api/auth/me` to restore session from cookie
- `login()` → calls API, stores user in state (no localStorage)
- `logout()` → calls `POST /api/auth/logout`, clears state

### `client/src/utils/api.js`
Axios instance:
- `baseURL`: `VITE_API_URL` env var
- `withCredentials: true` on all requests
- Response interceptor: if 401 received AND not already on `/login`, redirects to `/login`

### `client/src/utils/constants.js`
Single source of truth for:
- `DOMAINS` — `{ academics: { label, icon, color }, ... }`
- `STATUSES` — `{ raised: { label, color, bg }, ... }`
- `ROLES` — `{ student: 'Student', council_member: 'Council Member', ... }`

### `client/src/hooks/useComplaints.js`
Custom hook that wraps `GET /api/complaints` with loading/error state and a `refetch()` helper.

---

## 10. Key Components

| Component | File | Purpose |
|-----------|------|---------|
| `EscalateModal` | `EscalateModal.jsx` | Anonymity decision modal — MOST CRITICAL |
| `Timeline` | `Timeline.jsx` | Chronological audit trail with timestamps |
| `NotificationBell` | `NotificationBell.jsx` | Navbar bell with unread count badge |
| `AnalyticsDashboard` | `AnalyticsDashboard.jsx` | Recharts charts: FCR, CSAT, SLA breach rate, domain heatmap, response time histogram |
| `AuditLogViewer` | `AuditLogViewer.jsx` | Paginated, filterable audit log table |
| `BulkActionBar` | `BulkActionBar.jsx` | Floating bar for mass status update / bulk assign |
| `ConsensusVotingPanel` | `ConsensusVotingPanel.jsx` | Lists pending votes; `RequestConsensusButton` exported |
| `DelegationManager` | `DelegationManager.jsx` | Create/cancel/view delegations |
| `MeetingAgendaGenerator` | `MeetingAgendaGenerator.jsx` | Auto-generates council meeting agenda from open cases |
| `TermLimitPanel` | `TermLimitPanel.jsx` | Principal tab: council tenure management + expiry alerts |
| `WorkflowTemplatesPanel` | `WorkflowTemplatesPanel.jsx` | Template CRUD; `WorkflowTemplatesPanelWithAuth` exported |
| `MarkdownRenderer` | `MarkdownRenderer.jsx` | DOMPurify-sanitized markdown renderer for complaint descriptions |
| `RichTextEditor` | `RichTextEditor.jsx` | Bold/bullets/links editor for complaint submission |
| `PrivacyNoticeGate` | `PrivacyNoticeGate.jsx` | First-login DPDP privacy consent modal |
| `SessionTimeoutModal` | `SessionTimeoutModal.jsx` | 30-min inactivity warning + auto-logout |
| `DataErasureModal` | `DataErasureModal.jsx` | Student files erasure request (DPDP Act) |
| `ErasureRequestsPanel` | `ErasureRequestsPanel.jsx` | Principal tab: review erasure requests |
| `SuggestionBox` | `SuggestionBox.jsx` | Pre-complaint anonymous Q&A with counselor |
| `ComplaintProgressBar` | `ComplaintProgressBar.jsx` | Visual lifecycle step indicator for students |
| `FeedbackCard` | `FeedbackCard.jsx` | CSAT star rating shown after resolution |
| `ResolutionTemplatePicker` | `ResolutionTemplatePicker.jsx` | Template picker injected into resolve textarea |
| `MergeModal` | `MergeModal.jsx` | Select target complaint to merge into |
| `AppealModal` | `AppealModal.jsx` | Student files appeal on closed complaint |
| `TenureBadge` | exported from `TermLimitPanel.jsx` | Reusable "Xd left" badge for use in other dashboards |

---

## 11. Dashboard Summary

### `StudentDashboard.jsx`
- Shows only the student's own complaints
- "Raise a Complaint" CTA button
- Each card: complaint_no, domain badge, status pill, date, SLA indicator
- ComplaintProgressBar shows lifecycle stage
- DataErasureModal can be triggered from profile icon

### `RaiseComplaint.jsx`
- Domain picker with icons
- RichTextEditor for description (min 50 chars)
- FileUpload (optional attachment)
- Anonymity toggle with explanation text
- Auto-save draft on blur
- POSH/POCSO keyword detection (visual warning)
- On submit: confirmation screen with VOX-XXXX number

### `ComplaintDetail.jsx`
- Full complaint view for all roles
- Action buttons are context-aware (shown based on role + current status)
- Timeline at bottom
- InternalNotes panel (staff only)
- Consensus-aware: if council_member + behaviour/personal domain, shows RequestConsensusButton instead of Resolve
- MarkdownRenderer for description

### `CouncilDashboard.jsx`
Tabs: Complaints | 🤝 Consensus | 🔁 Delegation
- Always shows real student name (even if anon requested) with "(Anon Req)" badge
- BulkActionBar for mass actions
- ConsensusVotingPanel on consensus tab
- DelegationManager on delegation tab

### `TeacherDashboard.jsx`
- Shows complaints escalated to teacher
- Conditionally renders name based on `identity_revealed`

### `CoordinatorDashboard.jsx`
Tabs: Complaints | 🔁 Delegations | Suggestions
- Filterable by status, domain, section
- DelegationManager tab
- SuggestionBox counselor-reply interface

### `PrincipalDashboard.jsx`
Tabs: 📋 Complaints | 📩 Appeals | 📊 Analytics | 🗑️ Erasure Requests | 🔍 Audit Log | ⚙️ Workflows | 👥 Council Tenure
- Stats row: total raised / resolved / pending / escalated to principal
- Full-system complaint view with search + filters
- AppealsPanel (uphold/reject closed complaint appeals)
- AnalyticsDashboard with Recharts
- ErasureRequestsPanel
- AuditLogViewer
- WorkflowTemplatesPanelWithAuth (read-only)
- TermLimitPanel (manage council member tenure, expiry alerts)

### `SupervisorDashboard.jsx`
- Read-only all-system overview
- Full names always visible
- Can add notes to any complaint
- Stats per house/section

### `VicePrincipalDashboard.jsx`
- Same access as principal
- Mirror of PrincipalDashboard with VP branding

---

## 12. File Structure (current)

```
vox-dpsi/
├── CLAUDE.md                      ← THIS FILE — read first
├── TECHNICAL_DOCS.md              ← older detailed docs (partially stale)
├── README.md                      ← public-facing summary
├── schema.sql                     ← complete DB schema — run once in Supabase
├── schema_and_seed.sql            ← schema + demo seed combined
├── seed.sql                       ← demo users + sample complaints only
├── SEED_MIGRATION.sql             ← (in .gitignore) seed with sensitive data
├── migration_consensus.sql        ← ⚠️ PENDING — run in Supabase SQL editor
├── migration_delegation.sql       ← ⚠️ PENDING — run in Supabase SQL editor
├── migration_term_limits.sql      ← ⚠️ PENDING — run in Supabase SQL editor
├── migration_erasure_feedback.sql ← may already be applied — check Supabase
├── vercel.json                    ← Vercel build config
├── railway.json                   ← Railway deploy config
├── .gitignore
│
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env                       ← excluded from git; set in Vercel dashboard
│   ├── public/
│   │   ├── dps-logo.png
│   │   ├── manifest.json          ← PWA manifest
│   │   ├── sw.js                  ← service worker
│   │   └── presentation/          ← standalone HTML presentation (11 slides)
│   └── src/
│       ├── App.jsx                ← routes + role guards
│       ├── main.jsx
│       ├── index.css              ← Tailwind + glass utilities
│       ├── i18n/                  ← Hindi/English translations (task #11)
│       │   ├── en.json
│       │   └── hi.json
│       ├── components/            ← (listed in Section 10)
│       ├── pages/                 ← (listed in Section 11)
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── hooks/
│       │   └── useComplaints.js
│       └── utils/
│           ├── api.js             ← axios + withCredentials + 401 interceptor
│           ├── constants.js       ← DOMAINS, STATUSES, ROLES, COLORS
│           └── formatDate.js      ← formatIST(), timeAgo()
│
└── server/
    ├── index.js                   ← Express app, middleware, route mounts, cron start
    ├── package.json               ← "type": "module"; ES modules throughout
    ├── Procfile                   ← "web: node index.js"
    ├── .env                       ← excluded from git; set in Railway dashboard
    ├── db/
    │   └── supabase.js            ← createClient with SUPABASE_SERVICE_KEY
    ├── middleware/
    │   ├── auth.js                ← verifyToken (reads cookie)
    │   └── roleGuard.js           ← allowRoles(...roles) factory
    ├── routes/
    │   ├── auth.js
    │   ├── complaints.js          ← largest file; all complaint operations
    │   ├── timeline.js
    │   ├── notes.js
    │   ├── upload.js              ← multer → sharp → Supabase Storage
    │   ├── users.js               ← includes term management + erasure requests
    │   ├── notifications.js
    │   ├── suggestions.js
    │   ├── auditLog.js
    │   ├── workflowTemplates.js
    │   ├── resolutionTemplates.js
    │   └── delegations.js
    ├── services/
    │   ├── email.js               ← nodemailer email sender
    │   ├── notifications.js       ← in-app notification creator + WhatsApp sender
    │   └── whatsapp.js            ← Twilio WhatsApp integration
    ├── jobs/
    │   └── autoEscalate.js        ← 3 cron jobs: SLA escalate, retention, term-expiry
    └── utils/
        ├── complaintNo.js         ← SERIAL → 'VOX-0001' formatter
        └── keywords.js            ← POSH_KEYWORDS, POCSO_KEYWORDS arrays
```

---

## 13. Environment Variables

### `server/.env` (set in Railway dashboard → Variables)
```
PORT=5000
SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key — from Supabase → Settings → API>
JWT_SECRET=<min 32 char random string>
CLIENT_URL=https://vox-dpsi.vercel.app

# Nodemailer (any SMTP works)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=arrunabh.s@gmail.com
SMTP_PASS=<gmail app password>
SMTP_FROM="Vox DPSI <arrunabh.s@gmail.com>"

# Twilio WhatsApp (task #27 — partially set up)
TWILIO_ACCOUNT_SID=<from twilio.com>
TWILIO_AUTH_TOKEN=<from twilio.com>
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
ADMIN_WHATSAPP_NUMBER=+916268549591
```

### `client/.env` (set in Vercel dashboard → Settings → Environment Variables)
```
VITE_API_URL=https://vox-dpsi-production-6d95.up.railway.app
VITE_SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key — from Supabase → Settings → API>
```

---

## 14. Deployment

### Frontend (Vercel)
- Auto-deploys from GitHub on every push to `main`
- Build command: `cd client && npm install && npm run build`
- Output directory: `client/dist`

### Backend (Railway)
- Auto-deploys from GitHub on every push to `main`
- Root directory: `server` (configured in Railway dashboard)
- Start command: `node index.js`
- If Railway has `rootDirectory` set to `/server` in its config: start command = `node index.js`
- If Railway deploys from repo root: start command = `cd server && node index.js`

**⚠️ Important:** Railway's Nixpacks builder needs to find `package.json` at its root directory.
The `railway.json` at repo root says `startCommand: "node index.js"` — this only works if
Railway is configured to use `server/` as the root directory. Verify in Railway dashboard →
Settings → Source → Root Directory = `server`.

### Database
Schema already deployed. To re-run:
1. https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql
2. Paste + run `schema_and_seed.sql`
3. Then run each pending migration file

---

## 15. Local Development

```bash
# Clone
git clone https://github.com/Arrunabh-Singh/VOX-DPSI.git
cd vox-dpsi

# Backend
cd server
npm install
# Create server/.env with values from Section 13
node index.js        # runs on http://localhost:5000

# Frontend (new terminal)
cd client
npm install
# Create client/.env with VITE_API_URL=http://localhost:5000
npm run dev          # runs on http://localhost:5173
```

---

## 16. Completed Tasks (90 total)

Tasks 1–26, 30–33, 35–36, 49–60, 62, 64, 68, 71–74, 78–79, 82–90 are **complete**.

Key features built:
- Full complaint lifecycle (raise → verify → in_progress → escalate → resolve → close → reopen)
- 8-role RBAC with JWT HttpOnly cookie auth
- Anonymity system with council-controlled reveal
- POSH/POCSO keyword triage engine
- Multilingual (Hindi/English)
- Rich text editor + markdown rendering
- Analytics dashboard (FCR, CSAT, SLA breach rate, heatmap, response time histogram)
- CSV/PDF export
- Role-based delegation
- Consensus voting for sensitive cases
- Audit log viewer
- Meeting agenda generator
- Term-limit tracking
- Email notifications
- In-app notification bell
- Session timeout + auto-logout
- Data retention policy (auto-archive 2yr)
- PII masking in exports
- Formal printable complaint reports
- Resolution template library
- POSH IC member role
- VPC (Verifiable Parental Consent) flow
- Data erasure requests (DPDP Act)
- Age-appropriate privacy notice
- PWA manifest + service worker
- Quick exit button
- Auto-save drafts
- Childline/NCPCR crisis links
- Complaint access log
- Complaint merging
- Bulk actions
- SLA approaching alerts
- Duplicate detection
- Scheduled follow-up reminders

---

## 17. Pending Tasks

These tasks are **not yet built**:

| # | Feature | Priority |
|---|---------|----------|
| 27 | WhatsApp Notifications (Twilio sandbox partially set up — finish production upgrade) | Medium |
| 28 | Daily Digest email for handlers (morning summary of pending complaints) | Low |
| 29 | DPDP Act 2023 compliance audit (schema + flows partially done — formal audit pending) | High |
| 34 | Knowledge Base / FAQ for students | Low |
| 37 | Skills-based assignment (route by domain expertise) | Medium |
| 38 | Load balancing (equal distribution) | Medium |
| 39 | Auto-assignment rules engine | Medium |
| 40 | Round-robin fallback assignment | Medium |
| 41 | AI sentiment analysis on complaint descriptions | Low |
| 42 | AI auto-categorization by domain | Low |
| 43 | Gibberish/spam detection | Low |
| 44 | AI-suggested resolution templates | Low |
| 45 | Google Calendar integration for follow-up meetings | Low |
| 46 | SMS notifications via Indian telecom API | Low |
| 61 | Breach notification plan + incident response playbook | High |
| 63 | Guardian/parent role (read-only complaint visibility) | Medium |
| 65 | Staging environment (second Vercel+Railway+Supabase branch) | Medium |
| 66 | Uptime monitoring (UptimeRobot) | Medium |
| 67 | Migration rollback scripts | Low |
| 69 | Pre-complaint safe dialogue channel | Low |
| 70 | Council member onboarding training module | Low |
| 75 | Vendor DPAs (Vercel, Railway, Supabase) | High |
| 76 | DPIA documentation | High |
| 80 | OTP-based parental verification | Medium |
| 81 | Mumbai region migration (Supabase ap-south-1, Vercel bom1) | Low |

---

## 18. Demo Flow (3 minutes)

1. Login as `student@dpsi.com` → Raise complaint (Infrastructure, anonymous, attach image)
2. Login as `council@dpsi.com` → See "(Anon Req)" badge, click Mark Verified → Mark In Progress → Escalate (choose NO to keep identity hidden) → fill reason
3. Login as `coordinator@dpsi.com` → See complaint as "Anonymous Student" → Resolve with note
4. Login as `principal@dpsi.com` → See full dashboard stats, Analytics tab, Council Tenure tab
5. Login as `supervisor@dpsi.com` → See all-system overview, full names always visible

---

*Last updated: May 5, 2026 — Claude (Anthropic) via Cowork mode*
*Push this file alongside any new feature work so the next AI stays oriented.*
