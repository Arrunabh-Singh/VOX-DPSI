# Vox DPSI — Full Technical Documentation

> Complete reference for developers, AI assistants, and future maintainers.  
> Live app: https://vox-dpsi.vercel.app  
> GitHub: https://github.com/Arrunabh-Singh/VOX-DPSI

---

## Quick Context

Vox DPSI is a student grievance management system for Delhi Public School Indore. Built as a working prototype for Arrunabh Singh's School President interview presentation to the Principal. The app runs in Chrome on a tablet (primary) and is also optimized for iPhone (principal's phone).

**Owner:** Arrunabh Singh (arrunabh.s@gmail.com) — School President & lead developer  
**Admin WhatsApp:** +916268549591

---

## Tech Stack

| Layer | Technology | Host |
|-------|-----------|------|
| Frontend | React 18 + Vite + Tailwind CSS | Vercel |
| Backend | Node.js + Express (ES modules) | Railway |
| Database | Supabase (PostgreSQL) | Supabase |
| Auth | JWT (jsonwebtoken + bcryptjs) | Self-hosted |
| File Storage | Supabase Storage | Supabase |
| Notifications | In-app (Supabase) + WhatsApp (Twilio) | Twilio sandbox |

---

## Repository Structure

```
vox-dpsi/
├── client/                      React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx         Sticky nav with bell, user info, logout
│   │   │   ├── NotificationBell.jsx  In-app notification dropdown
│   │   │   ├── ComplaintCard.jsx  Card component used in all dashboards
│   │   │   ├── StatusPill.jsx     Colored pill for complaint status
│   │   │   ├── DomainBadge.jsx    Domain badge with icon and color
│   │   │   ├── Timeline.jsx       Chronological audit trail
│   │   │   ├── EscalateModal.jsx  Escalation modal with anonymity decision
│   │   │   ├── AppealModal.jsx    Appeal filing modal (student)
│   │   │   ├── FeedbackCard.jsx   Star rating after resolution
│   │   │   ├── InternalNotes.jsx  Staff-only notes panel
│   │   │   ├── FileUpload.jsx     Supabase Storage upload
│   │   │   ├── AnalyticsDashboard.jsx  Recharts analytics (principal/supervisor)
│   │   │   ├── SkeletonCard.jsx   Loading skeletons
│   │   │   ├── Footer.jsx         Bottom footer
│   │   │   └── VoxLogo.jsx        SVG wordmark + shield
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── RaiseComplaint.jsx
│   │   │   ├── ComplaintDetail.jsx   Core handler view with all action buttons
│   │   │   ├── CouncilDashboard.jsx
│   │   │   ├── TeacherDashboard.jsx
│   │   │   ├── CoordinatorDashboard.jsx
│   │   │   ├── PrincipalDashboard.jsx
│   │   │   ├── SupervisorDashboard.jsx
│   │   │   └── VicePrincipalDashboard.jsx
│   │   ├── context/AuthContext.jsx  JWT token management
│   │   ├── hooks/
│   │   │   └── useComplaints.js    Fetches complaint list / single complaint
│   │   ├── utils/
│   │   │   ├── api.js             Axios instance with JWT Authorization header
│   │   │   ├── constants.js       DOMAINS, STATUSES, ROLES (colors, labels, icons)
│   │   │   └── formatDate.js      formatIST(), timeAgo()
│   │   ├── App.jsx                React Router + role-based routing
│   │   ├── main.jsx
│   │   └── index.css              Global CSS: glass utilities, animations, mobile
│   ├── index.html                  viewport-fit=cover for iOS
│   └── vite.config.js
│
├── server/
│   ├── routes/
│   │   ├── auth.js                POST /api/auth/login, GET /api/auth/me
│   │   ├── complaints.js          Core complaint CRUD + escalation + appeal + deletion
│   │   ├── timeline.js            GET/POST /api/complaints/:id/timeline
│   │   ├── upload.js              POST /api/upload → Supabase Storage
│   │   ├── users.js               GET/POST /api/users, PATCH /api/users/me
│   │   ├── notifications.js       GET /api/notifications, PATCH mark-read
│   │   └── notes.js               GET/POST /api/complaints/:id/notes (internal)
│   ├── middleware/
│   │   ├── auth.js                verifyToken() — checks JWT, attaches req.user
│   │   └── roleGuard.js           allowRoles(...roles) — 403 if role not in list
│   ├── db/supabase.js             Supabase JS client (service role key)
│   ├── services/
│   │   ├── notifications.js       In-app + WhatsApp notification helpers
│   │   └── whatsapp.js            Twilio client, message templates
│   ├── jobs/autoEscalate.js       Hourly cron: auto-escalate stale complaints
│   ├── utils/
│   │   ├── complaintNo.js         formatComplaintNo(n) → "VOX-001"
│   │   └── keywords.js            detectUrgency(text) → matched keyword | null
│   └── index.js                   Express app entry point + CORS + route mounting
│
├── schema.sql                     Full DB schema (create tables + RLS disabled)
├── seed.sql                       Demo seed data (accounts + complaints)
├── schema_and_seed.sql            Combined schema + seed in one file
├── .env.example                   All required env vars documented
├── CHANGELOG.md                   Full history of all changes by round
├── TECHNICAL_DOCS.md              This file
└── vox-dpsi/                      App code (monorepo)
```

---

## Environment Variables

### Server (`server/.env`)

```env
PORT=5000
SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
JWT_SECRET=<min_32_chars>
CLIENT_URL=https://vox-dpsi.vercel.app

# Twilio (optional — WhatsApp notifications)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=<auth_token>
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
ADMIN_WHATSAPP_NUMBER=whatsapp:+916268549591
```

### Client (`client/.env`)

```env
VITE_API_URL=https://vox-dpsi-production-6d95.up.railway.app
VITE_SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_public_key>
```

---

## Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| name | TEXT | |
| email | TEXT UNIQUE | |
| password_hash | TEXT | bcrypt, 12 rounds |
| role | TEXT | student / council_member / class_teacher / coordinator / principal / supervisor |
| scholar_no | TEXT | students only |
| section | TEXT | e.g. "XII B" |
| house | TEXT | Prithvi / Agni / Jal / Vayu |
| phone | TEXT | optional, for WhatsApp |
| created_at | TIMESTAMPTZ | |

### `complaints`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| complaint_no | SERIAL | auto-increment, used to format VOX-001 |
| student_id | UUID FK → users | |
| domain | TEXT | academics / infrastructure / safety / personal / behaviour / other |
| description | TEXT | min 50 chars |
| priority | TEXT | normal / urgent |
| is_anonymous_requested | BOOLEAN | |
| identity_revealed | BOOLEAN | set true on escalation if council approves |
| attachment_url | TEXT | Supabase Storage public URL |
| status | TEXT | raised / verified / in_progress / escalated_to_teacher / escalated_to_coordinator / escalated_to_principal / resolved / closed / appealed |
| assigned_council_member_id | UUID FK → users | |
| supervisor_id | UUID FK → users | |
| current_handler_role | TEXT | which role's dashboard shows this |
| is_auto_escalated | BOOLEAN | set by cron job |
| sla_deadline | TIMESTAMPTZ | 48h from raise/verify |
| feedback_rating | INT | 1-5, student submits post-resolution |
| feedback_note | TEXT | |
| feedback_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | updated on every action |

### `complaint_timeline`
Audit log. Every action appends a row.
| Column | Notes |
|--------|-------|
| complaint_id | FK → complaints |
| action | Short description e.g. "Verified in person", "Escalated to coordinator" |
| performed_by | FK → users (null for system/cron actions) |
| performed_by_role | Role string or "system" |
| note | Optional longer note |

### `escalations`
| Column | Notes |
|--------|-------|
| complaint_id | FK → complaints |
| escalated_by | FK → users |
| escalated_to_role | class_teacher / coordinator / principal |
| student_consent | Whether identity was revealed |
| reason | Text reason given |

### `notifications`
| Column | Notes |
|--------|-------|
| user_id | FK → users |
| title | Short title |
| body | Message body |
| type | assignment / status_update / escalation / auto_escalation |
| complaint_id | FK → complaints (for navigation on click) |
| is_read | Boolean |

### `appeals`
| Column | Notes |
|--------|-------|
| complaint_id | FK → complaints |
| filed_by | FK → users (student) |
| reason | Min 50 chars |
| status | pending / upheld / rejected |
| reviewer_id | FK → users |
| reviewer_note | Required on review |
| resolved_at | TIMESTAMPTZ |

### `complaint_deletions`
| Column | Notes |
|--------|-------|
| complaint_id | FK → complaints |
| requested_by | FK → users (council member) |
| reason | Min 20 chars |
| council_approved | Always true when created |
| superior_approved | Set by supervisor review |
| status | pending / approved / rejected |
| superior_id | FK → users |
| superior_note | Optional |
| resolved_at | TIMESTAMPTZ |

---

## API Routes Reference

### Auth
```
POST   /api/auth/register         Create account (not exposed in UI, use seed)
POST   /api/auth/login            { email, password } → { token, user }
GET    /api/auth/me               Returns logged-in user from JWT
```

### Complaints
```
POST   /api/complaints                         Raise complaint (student only)
GET    /api/complaints                         Role-filtered list
GET    /api/complaints/:id                     Detail view (access controlled)
PATCH  /api/complaints/:id/verify              Mark verified (council only)
PATCH  /api/complaints/:id/status             Update status { status, note }
PATCH  /api/complaints/:id/resolve            Mark resolved { note }
PATCH  /api/complaints/:id/escalate           Escalate { escalate_to, reveal_identity, reason }
PATCH  /api/complaints/:id/assign             Re-assign council member (coordinator/principal)
PATCH  /api/complaints/:id/feedback           Student feedback { rating, note }
POST   /api/complaints/:id/appeal             File appeal { reason }
POST   /api/complaints/:id/deletion-request   Flag as gibberish { reason }
GET    /api/complaints/appeals/all            All appeals (supervisor/principal)
PATCH  /api/complaints/appeals/:id/review     Review appeal { decision, note }
GET    /api/complaints/deletion-requests/all  All deletion requests
PATCH  /api/complaints/deletion-requests/:id/review  Review deletion { decision, note }
GET    /api/complaints/export/csv             CSV export
```

### Timeline
```
GET    /api/complaints/:id/timeline
POST   /api/complaints/:id/timeline  { note }
```

### Notifications
```
GET    /api/notifications              Returns unread+recent for logged-in user
PATCH  /api/notifications/:id/read    Mark single as read
PATCH  /api/notifications/read-all    Mark all as read
```

### Users
```
GET    /api/users                 List users (principal/coordinator/supervisor)
POST   /api/users                 Create user (principal/coordinator)
PATCH  /api/users/me              Update own profile { house, section, phone }
```

### Upload
```
POST   /api/upload                Multipart file → Supabase Storage → returns { url }
```

---

## Role System

| Role | Dashboard | Sees complaints | Can take action |
|------|-----------|----------------|----------------|
| `student` | StudentDashboard | Own only | Raise, view, rate, appeal |
| `council_member` | CouncilDashboard | Assigned to them | Verify, in_progress, resolve, escalate, flag gibberish |
| `class_teacher` | TeacherDashboard | `current_handler_role = class_teacher` | In progress, resolve, escalate |
| `coordinator` | CoordinatorDashboard | coordinator + principal level | In progress, resolve, escalate, re-assign |
| `principal` | PrincipalDashboard | All | Resolve, close, review appeals |
| `supervisor` | SupervisorDashboard | All | Read + notes, review appeals + deletions |

---

## Status Flow

```
raised
  → verified          (council: met student in person)
    → in_progress     (council/teacher/coordinator: working on it)
      → resolved
      → escalated_to_teacher
          → resolved
          → escalated_to_coordinator
              → resolved
              → escalated_to_principal
                  → resolved / closed
resolved
  → appealed          (student files appeal)
      → in_progress   (if upheld by principal/supervisor)
      → resolved      (if rejected, stays resolved)
```

---

## Notification Flow

Every key event triggers **in-app notification** (Supabase insert) + optional **WhatsApp** (Twilio):

| Event | Who gets notified |
|-------|-----------------|
| Complaint raised | Student (received), Council member (assigned), Admin WhatsApp |
| Complaint verified | Student |
| Status → in_progress | Student |
| Escalation | Student + all users with target role |
| Resolved | Student |
| Auto-escalated (cron) | Student + all supervisors + all coordinators |

---

## Anonymity Logic

1. Student sets `is_anonymous_requested: true` when raising
2. Council member always sees real student name (+ "Anon Requested" badge)
3. On escalation: council is prompted — reveal identity to next handler?
   - NO → `identity_revealed` stays false → teacher/coordinator sees "Anonymous Student"
   - YES → `identity_revealed` set true → all roles see real name
4. Escalation to Principal always reveals identity (`escalated_to_principal` → `identity_revealed: true`)
5. Principal and Supervisor always see real identity regardless

---

## Urgency Detection

`server/utils/keywords.js` — `detectUrgency(text)` returns first matched keyword or null.

Keywords that auto-flag to URGENT: harassment, abuse, bullying, ragging, violence, fight, assault, threat, emergency, injury, hurt, unsafe, danger, discriminat, sexu, molest, inappropriate, mental health, suicide, self-harm, weapon.

If user also sets priority = 'urgent', it stays urgent. Auto-flagging adds a timeline entry noting the detected keyword.

---

## Auto-Escalation Cron

`server/jobs/autoEscalate.js` — runs every hour (`0 * * * *`).

Finds complaints where:
- `status IN ('raised', 'verified', 'in_progress')`
- `current_handler_role = 'council_member'`
- `is_auto_escalated = false`
- `updated_at < now() - 72 hours`

Action: update status to `escalated_to_coordinator`, set `is_auto_escalated = true`, add timeline + escalation record, notify student + supervisors + coordinators.

---

## Deployment

### Frontend (Vercel)
- Repo: `Arrunabh-Singh/VOX-DPSI`
- Root: `client/`
- Build: `npm run build` → `dist/`
- Env: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Handles SPA routing via `vercel.json` rewrite rule

### Backend (Railway)
- Root: `server/`
- Start: `node index.js`
- Env: All SERVER env vars above
- CORS allowed origin: `https://vox-dpsi.vercel.app`

### Supabase
- Project URL: `https://gznhziptmydkalsrazpj.supabase.co`
- Service role key needed in server
- Anon key used in client (for file upload)
- RLS: disabled (app-level access control via JWT + route guards)
- Storage bucket: `complaint-attachments` (public)

---

## Known Issues & Future Work

1. **Twilio setup:** Sandbox requires each number to join via WhatsApp first. When upgrading from sandbox, update `TWILIO_WHATSAPP_FROM` to a real Twilio number.
2. **Class Teacher assignment:** Currently ALL class teachers see complaints at teacher level. Could add section-based filtering (`teacher.section === complaint.student.section`).
3. **Notification real-time:** Currently polls every 60s. Could upgrade to Supabase realtime subscriptions for instant delivery.
4. **File storage:** Supabase Storage bucket `complaint-attachments` must exist and be set to public. Create it manually in Supabase Dashboard if not present.
5. **Password reset:** No forgot-password flow. Admin must update `password_hash` directly in Supabase.
6. **Mobile login quick-access:** Quick-login buttons auto-fill and submit — works on mobile tap.

---

## Demo Flow (3-minute presentation)

1. **Login as student** (`5001@student.dpsindore.org` / `demo123`) → Raise complaint (Infrastructure, attach photo, request anonymity) → Note the VOX-XXXX number
2. **Login as council** (`5002@student.dpsindore.org`) → See assigned complaint → Notice "Anon Requested" badge, real name visible → Mark Verified → Mark In Progress → Escalate (choose Keep Anonymous)
3. **Login as coordinator** (`coordinator@dpsi.com`) → See escalated complaint, "Anonymous Student" → Resolve or re-escalate
4. **Login as principal** (`principal@dpsi.com`) → Full dashboard with stats → Analytics tab → Appeals tab → Export CSV
5. **Login as supervisor** (`supervisor@dpsi.com`) → System-wide overview → Analytics → Deletion requests

---

## Git Notes

The `.git/index.lock` file occasionally gets stuck due to the sandbox filesystem mount. If git commands fail with "index.lock exists":

```bash
# Workaround: use separate index file
export GIT_INDEX_FILE=/tmp/vox_idx_fresh
git read-tree HEAD
# ... stage files ...
git commit-tree <tree> -p <parent> -m "message"
git push origin <hash>:refs/heads/main
```

Alternatively, delete the lock file directly on the user's machine if accessible.
