# CLAUDE.md — Vox DPSI (Optimized for Token Efficiency)
> **Read this entire file before touching anything. Single source of truth.**
> Built by Arrunabh Singh (arrunabh.s@gmail.com), Class XII B, DPS Indore.

---

## 1. Project in 3 Lines
Student grievance management PWA for DPS Indore. Students file complaints → council handles → escalates through Teacher → Coordinator → Principal. Every action permanently logged. 307 failure modes mapped.

**Live:** https://vox-dpsi.vercel.app | **Backend:** Railway (migrating to Render) | **DB:** Supabase (Mumbai ap-south-1) | **Repo:** github.com/Arrunabh-Singh/VOX-DPSI

---

## 2. Tech Stack (Do Not Change)
| Layer | Tech | Host |
|-------|------|------|
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 | Vercel |
| Backend | Node.js + Express (ES modules `"type":"module"`) | Railway → **Render** (migration planned) |
| Database | Supabase PostgreSQL (Mumbai) | Supabase |
| Auth | JWT via HttpOnly cookie (cookie-parser) | — |
| Storage | Supabase Storage (private bucket + signed URLs) | Supabase |
| Email | Brevo API (switched from Resend/SMTP) | — |
| Cron | node-cron (in-process) | — |

**Brand:** Primary `#2d5c26` (DPS green), Gold `#c9a84c`, BG `#F5F7FA`

---

## 3. Roles (8)
| Role | Email | Dashboard | Key Permission |
|------|-------|-----------|----------------|
| student | 5411@student.dpsindore.org | StudentDashboard | Own complaints only |
| council_member | council@dpsi.com | CouncilDashboard | Assigned; always sees real name |
| supervisor | supervisor@dpsi.com | SupervisorDashboard | All read-only + notes |
| class_teacher | teacher@dpsi.com | TeacherDashboard | Escalated-to-teacher |
| coordinator | coordinator@dpsi.com | CoordinatorDashboard | All coordinator-level |
| principal | principal@dpsi.com | PrincipalDashboard | Full view + CSV export |
| vice_principal | — | VicePrincipalDashboard | Same as principal |
| board_member | — | SupervisorDashboard | Read-only |

**All demo passwords:** `demo123`

---

## 4. Critical Rules (NEVER Break These)

### Code Safety
```bash
# After EVERY server JS file write — run this:
python3 -c "
import sys
with open(sys.argv[1], 'rb') as f: c = f.read()
n = c.count(b'\x00')
if n: print(f'NULL BYTES ({n}) FOUND — DO NOT COMMIT'); sys.exit(1)
else: print('clean')
" path/to/file.js
node --check path/to/file.js && echo "SYNTAX OK"
tail -3 path/to/file.js  # must end with: export default router
```

### Pre-commit Full Scan
```bash
python3 -c "
import glob, os
any_bad = False
for path in glob.glob('server/**/*.js', recursive=True) + ['server/package.json']:
    if not os.path.isfile(path): continue
    with open(path, 'rb') as f: c = f.read()
    n = c.count(b'\x00')
    if n: print(f'NULL BYTES ({n}): {path}'); any_bad = True
if not any_bad: print('ALL CLEAN')
"
```

### Git
- Always `git pull` before starting work
- Commit after every working change: `git add -A && git commit -m "feat/fix: description" && git push`
- Never push broken code to main
- Use feature branches for large changes: `git checkout -b feature/name`

---

## 5. Database Schema (Summary)
**Full schema in `schema.sql`. Extensions in `migration_*.sql` files.**

### Core Tables
- **users** — id, name, email, password_hash, role, scholar_no, section, house, phone, term_start/end, vpc_status, is_privacy_acknowledged
- **complaints** — id, complaint_no (SERIAL → VOX-0001), student_id, domain, description, is_anonymous_requested, identity_revealed, attachment_url, status, assigned_council_member_id, supervisor_id, current_handler_role, sla_deadline, consensus fields, merge fields, draft_data, display_created_at, reopen_count
- **complaint_timeline** — immutable audit trail (NEVER delete)
- **escalations** — complaint_id, escalated_by, escalated_to_role, student_consent, reason

### Extension Tables (verify migrations applied)
- **notifications** — user_id, title, body, link, is_read
- **complaint_access_log** — complaint_id, viewer_id, viewer_role, accessed_at, ip_address
- **audit_log** — actor_id, action, entity_type, entity_id, details, ip_address
- **complaint_votes** — complaint_id, voter_id, vote (approve/reject), note
- **delegation_rules** — delegator_id, delegate_id, start_date, end_date, reason
- **workflow_templates** — name, domain, steps (JSONB)
- **resolution_templates** — title, body, domain
- **system_config** — key, value (for app settings)

### Pending Migrations (MUST be run in Supabase SQL Editor)
Run in order at: https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql
1. `migration_delegation.sql`
2. `migration_consensus.sql`
3. `migration_term_limits.sql`
4. `migration_guardian_role.sql`
5. `migration_erasure_feedback.sql`
6. `migration_system_config.sql`

---

## 6. API Routes (All under `/api`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /auth/register | — | Register (VPC for students) |
| POST | /auth/login | — | Login → JWT cookie |
| GET | /auth/me | ✅ | Current user |
| POST | /auth/erasure-request | ✅ | DPDP erasure |
| POST | /complaints | Student | Raise complaint |
| GET | /complaints | ✅ | Role-filtered list |
| GET | /complaints/:id | ✅ | Detail (role-gated) |
| PATCH | /complaints/:id/status | ✅ | Update status |
| PATCH | /complaints/:id/assign | ✅ | Assign council |
| PATCH | /complaints/:id/verify | Council | Mark verified |
| PATCH | /complaints/:id/escalate | ✅ | Escalate (anonymity modal) |
| PATCH | /complaints/:id/resolve | ✅ | Mark resolved |
| GET | /complaints/:id/timeline | ✅ | Audit trail |
| POST | /complaints/:id/timeline | ✅ | Add note |
| POST | /upload | ✅ | File → Supabase Storage |
| GET | /users | Admin | List users |
| GET | /notifications | ✅ | User notifications |
| GET | /audit-log | Admin | Audit log |
| GET | /health | — | Health check |

---

## 7. Anonymity System (CRITICAL — Do Not Break)
1. Student sets `is_anonymous_requested: true` on submission
2. **Council member ALWAYS sees real name** regardless
3. On escalation to teacher+: modal asks "Reveal identity?"
   - NO → name hidden, shows "Anonymous Student"
   - YES → `identity_revealed = true`, name visible at all levels
4. Timeline logs the decision
5. Supervisor always sees full names
6. **VPC flow:** Parent consent required before student can use system (even for "anonymous")

---

## 8. Complaint Status Flow
```
raised → verified → in_progress → resolved
                            ↓
                   escalated_to_teacher → resolved
                                              ↓
                                     escalated_to_coordinator → resolved
                                                                  ↓
                                                         escalated_to_principal → resolved/closed
```
Any resolved complaint can be **reopened** (reopen_count tracked).

---

## 9. File Structure
```
vox-dpsi/
├── CLAUDE.md                    ← This file
├── schema.sql                   ← Full DB schema
├── seed.sql                     ← Demo data
├── migration_*.sql              ← Pending migrations
├── server/
│   ├── index.js                 ← Express app entry
│   ├── package.json
│   ├── db/supabase.js           ← Supabase client
│   ├── middleware/
│   │   ├── auth.js              ← JWT verification
│   │   └── roleGuard.js         ← Role-based access
│   ├── routes/                  ← 15 route files
│   ├── services/                ← email, whatsapp, notifications
│   ├── jobs/autoEscalate.js     ← Cron jobs
│   └── utils/                   ← complaintNo.js, keywords.js
├── client/
│   ├── src/
│   │   ├── pages/               ← 15 page components
│   │   ├── components/          ← 30+ reusable components
│   │   ├── context/             ← AuthContext, LanguageContext
│   │   ├── hooks/               ← useComplaints, useSessionTimeout
│   │   └── utils/               ← api.js, constants.js, formatDate.js
│   ├── public/                  ← manifest, presentation/
│   └── vite.config.js
├── vercel.json
└── railway.json
```

---

## 10. Key Environment Variables

**Server (`server/.env`):**
```
PORT=5000
SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
JWT_SECRET=<min_32_chars>
CLIENT_URL=https://vox-dpsi.vercel.app
BREVO_API_KEY=<key>
```

**Client (`client/.env`):**
```
VITE_API_URL=https://vox-dpsi-production-6d95.up.railway.app
VITE_SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

---

## 11. What's Built vs Pending

### ✅ Built & Working (90+ tasks)
- Full complaint lifecycle, 8-role RBAC, anonymity system
- POSH/POCSO keyword triage, Hindi/English toggle
- Analytics dashboard, delegation, consensus voting
- Audit log, meeting agenda, term-limit tracking
- DPDP compliance (VPC, erasure, privacy gate)
- Session timeout, PWA, auto-save drafts, complaint merging

### 🔴 Critical (Do First)
1. Run all pending DB migrations
2. Fix config.js route ordering (assignment-rules before `/:key`)
3. Security audit — helmet, CORS, rate limiting, input sanitization
4. RLS policies verification in Supabase
5. Error boundary in React app
6. Health check endpoint verification

### 🟡 Important (Do Second)
7. Guardian/parent dashboard (read-only)
8. Daily digest email for handlers
9. Smart assignment (load balancing)
10. Knowledge base / FAQ page
11. Uptime monitoring (UptimeRobot)
12. Staging environment

### 🟢 Nice to Have (Do Third)
13. WhatsApp notifications (Twilio production)
14. AI complaint assistant
15. Multi-school support
16. Advanced analytics (heatmaps, trends)

---

## 12. Security Checklist (For June 1 Launch)
- [ ] Helmet headers enabled
- [ ] CORS restricted to Vercel domain only
- [ ] Rate limiting on all API routes (100 req/15min general, 5 req/15min auth)
- [ ] Input sanitization on all text fields (prevent XSS)
- [ ] SQL injection prevention (parameterized queries via Supabase)
- [ ] RLS policies active on ALL tables
- [ ] Service role key NEVER in client
- [ ] JWT expiry 7 days, secure cookie flags
- [ ] File upload: type whitelist (JPG/PNG/PDF), 5MB limit, UUID filenames
- [ ] CSP headers
- [ ] HSTS headers
- [ ] Error messages don't leak stack traces in production

---

## 13. Deployment

### Frontend (Vercel)
- Auto-deploys from GitHub main branch
- Build: `cd client && npm run build`
- Env vars set in Vercel dashboard

### Backend (Railway — current)
- Auto-deploys from GitHub
- Start: `cd server && node index.js`
- Health: `GET /health` → `{"status":"ok"}`

### Backend Migration (Railway → Render)
- **Why:** Railway free tier being discontinued
- **Plan:** Render.com free tier or Fly.io
- **Steps:** Create Render Web Service → connect GitHub → set env vars → deploy
- **Update:** `VITE_API_URL` in Vercel to new Render URL

---

## 14. MCP Servers to Configure
```bash
# Supabase MCP
claude mcp add -s project supabase -- npx @supabase/mcp-server-supabase --project-ref gznhziptmydkalsrazpj

# GitHub MCP
claude mcp add -s user github -- npx @modelcontextprotocol/server-github

# Vercel MCP
claude mcp add -s user vercel -- npx @vercel/mcp-server-vercel
```

---

## 15. Common Commands
```bash
# Local dev
cd server && npm run dev      # Backend on :5000
cd client && npm run dev      # Frontend on :5173

# Build
cd client && npm run build    # Production build

# Test
cd server && node --check index.js  # Syntax check

# Deploy
git add -A && git commit -m "message" && git push  # Auto-deploys both

# Supabase
# Run migrations at: https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql
```

---

## 16. Demo Flow (3-Minute Presentation)
1. Login as **Student** (5411@student.dpsindore.org) → Raise complaint (Infrastructure, anonymity ON)
2. Login as **Council** (council@dpsi.com) → See complaint + "(Anon Req)" badge → Verify → Escalate (hide identity)
3. Login as **Coordinator** (coordinator@dpsi.com) → See "Anonymous Student"
4. Login as **Principal** (principal@dpsi.com) → Full dashboard + stats + CSV export
5. Login as **Supervisor** (supervisor@dpsi.com) → All-system view

---

*Last updated: May 14, 2026 by OWL (Hermes). Optimized for token efficiency — 884 lines → ~400 lines without losing critical info.*
