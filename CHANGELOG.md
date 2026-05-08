# Vox DPSI — Full Changelog

**Project:** Student Grievance Management System — Delhi Public School Indore  
**Author:** Arrunabh Singh (School President & Lead Developer)  
**Stack:** React + Vite + Tailwind (Vercel) · Node.js + Express (Railway) · Supabase (PostgreSQL)  
**Live URL:** https://vox-dpsi.vercel.app

---

## Phase 1 — Project Setup & Core Auth
*Initial scaffolding, database schema, authentication*

- Created monorepo structure: `client/` (React + Vite) and `server/` (Express)
- Configured Supabase PostgreSQL with tables: `users`, `complaints`, `complaint_timeline`, `escalations`
- Implemented JWT-based auth with 6 roles: `student`, `council_member`, `class_teacher`, `coordinator`, `principal`, `supervisor`
- Built `POST /api/auth/login` and `GET /api/auth/me` endpoints
- Created `AuthContext.jsx` with `login()`, `logout()`, `user` state
- Protected routes with role-based redirect in `App.jsx`
- Deployed backend to Railway, frontend to Vercel

---

## Phase 2 — Core Complaint Flow
*Full raise → verify → escalate → resolve pipeline*

- Built `POST /api/complaints` — student raises complaint with domain, description, attachment, anonymity flag
- Built `GET /api/complaints` — role-filtered list (student sees own, council sees assigned, etc.)
- Built `PATCH /api/complaints/:id/verify` — council marks verified in person
- Built `PATCH /api/complaints/:id/status` — update to `in_progress`
- Built `PATCH /api/complaints/:id/resolve` — mark resolved with note
- Built `PATCH /api/complaints/:id/escalate` — escalation with anonymity decision
- **Anonymity system:** council always sees real name; escalation above council asks if identity should be revealed; principal always sees full identity
- Built all 6 role dashboards: Student, Council, Teacher, Coordinator, Principal, Supervisor
- `ComplaintCard.jsx` — clickable card with VOX-XXXX number, status pill, domain badge, SLA timer
- `Timeline.jsx` — chronological audit trail for each complaint
- `EscalateModal.jsx` — modal with anonymity decision and reason
- `StatusPill.jsx`, `DomainBadge.jsx` — consistent visual indicators

---

## Round 1 — Favicon + Alpha Badge + Page Titles

- Added `favicon.svg` — DPS Indore shield in green/gold
- Added "α Beta" gold badge to Navbar
- Set `document.title` on all pages (e.g. "VOX-001 — Vox DPSI")
- Added VoxWordmark component with SVG logo

---

## Round 2 — Login Page Redesign + UI Polish

- Rebuilt login screen: dark green gradient background, centered card, school crest
- Added quick-login buttons for all 6 demo accounts
- Password show/hide toggle
- Loading spinner on submit
- Navbar: sticky, glass effect, user name + role + sign out

---

## Round 3 — Priority System + SLA Timers + Keyword Detection

- Added `priority` field (`normal` / `urgent`) to complaints
- Keyword detection: auto-flags complaints as URGENT if description contains sensitive words (harassment, abuse, bullying, emergency, injury, threat, etc.)
- Timeline entry added when auto-flagged: "⚡ Auto-flagged Urgent — sensitive keyword detected"
- SLA badge on complaint cards: On Track / Due Soon / Act Now / OVERDUE (calculated from `updated_at`)
- URGENT complaints get orange left-border highlight on cards
- `RaiseComplaint.jsx` — added Priority selector and keyword info
- Overdue banner shown on `ComplaintDetail.jsx` for handlers

---

## Round 4 — Post-Resolution Feedback + Appeal System

- **Feedback:** After resolution, student sees star rating (1–5) + optional note form
- `FeedbackCard.jsx` component with animated star selector
- Feedback stored in `complaints.feedback_rating`, `feedback_note`, `feedback_at`
- **Appeals:** Student can file appeal on any resolved complaint (min 50 chars reason)
- `AppealModal.jsx` — modal
- `POST /api/complaints/:id/appeal` — creates appeal record, updates status to `appealed`
- `GET /api/complaints/appeals/all` — principal/supervisor sees all appeals
- Appeal review in Principal Dashboard: Uphold (reopens complaint to in_progress) or Reject
- `PATCH /api/complaints/appeals/:id/review` — records decision + reviewer note

---

## Round 5 — In-App Notifications + Internal Notes

- **Supabase `notifications` table:** `user_id`, `title`, `body`, `type`, `complaint_id`, `is_read`
- `NotificationBell.jsx` — bell icon in Navbar, polls every 60s, badge count, dropdown panel
- Mark individual notifications as read; mark all as read
- Click notification → navigate to complaint
- Notification types: `assignment`, `status_update`, `escalation`, `auto_escalation`
- **Internal Notes:** staff-only note panel on complaint detail, collapsed by default

---

## Round 6 — Analytics + Search + Filter + Export + Performance Score

- `AnalyticsDashboard.jsx` — recharts-powered analytics panel
  - KPI cards: Total / Resolved / Pending / Urgent / Avg Resolution Time
  - Pie chart: complaints by domain
  - Bar chart: complaints by status
  - Line chart: complaints over last 7 days
  - Bar chart: complaints by section (top 8)
  - Council Member Performance: resolution rate − (overdue × 10) score, bar chart + detail cards
- Principal dashboard: search bar, status + domain filters
- Export CSV button (client-side and server-side)
- Supervisor dashboard: full analytics + deletion request management

---

## Round 7 — WhatsApp Integration + Auto-Escalation Cron

- Integrated Twilio WhatsApp sandbox (`whatsapp:+14155238886`)
- `ADMIN_WHATSAPP_NUMBER` env var — Arrunabh's number (`+916268549591`) pinged on every key event
- `server/jobs/autoEscalate.js` — node-cron job, hourly:
  - Finds complaints stale >72h at council level
  - Auto-escalates to coordinator, sets `is_auto_escalated: true`
  - Logs to `escalations` table and `complaint_timeline`
  - Notifies supervisors via WhatsApp + in-app
- Auto-escalation banner shown on complaint detail

---

## Round 8 — SQL Seed Data

- Seeded 6 demo accounts with bcrypt-hashed passwords
- Seeded 10+ sample complaints in various statuses and domains
- Seed SQL in `seed.sql` and `schema_and_seed.sql`
- Password for all demo accounts: `demo123`

---

## Round 9 — Complaint Deletion with Dual Approval

- Council members can flag complaints as "gibberish" / invalid
- `POST /api/complaints/:id/deletion-request` — requires reason ≥ 20 chars
- `complaint_deletions` table tracks dual-approval state
- Supervisor approves or rejects via their dashboard
- On approval: timeline logged, then complaint deleted from DB
- Both approvals permanently logged for audit trail

---

## Round 10 — Full UI Overhaul (Forest Green + Parchment)

- Replaced navy/gold DPS branding with custom color system
- Primary: `#2d5c26` (forest green), Accent: `#c9a84c` (warm gold), Background: `#eae1c4` (parchment)
- New glass-card system: `.glass`, `.glass-dark`, `.glass-modal`, `.glass-nav`
- Updated all dashboards, components, and modals

---

## Round 11 — Principal Dashboard Fix

- Removed escalation button from Principal dashboard (principal is final handler)
- Fixed `canEscalate` logic in `ComplaintDetail.jsx`

---

## Round 12 — Performance Optimizations

- SLA deadline column added for indexed sorting
- Skeleton shimmer loading states (`SkeletonCard.jsx`)
- Reduced notification polling from 30s to 60s
- Added 2.5s delay before first notification fetch

---

## Round 13 — Commercial Pitch Presentation

- Built 15-slide PowerPoint deck (`Vox DPSI — Presentation.pptx`)
- Forest green + gold branding, DPS Indore identity
- Covers: Problem, Solution, Features, Status Flow, Tech Stack, Analytics, Security, Impact

---

## Round 14 — Notification System Fixes

- `notifyComplaintCreated` — student now gets in-app notification when complaint is received
- `notifyStatusChange` — student notified when status changes to `in_progress`
- Escalation handler notification — ALL users of the target role notified via in-app + WhatsApp
- `autoEscalate.js` — now creates in-app notifications for student and all supervisors/coordinators
- Cleaned up unused imports

---

## Round 15 — Mobile Optimization (iPhone 17 Pro Max)

- `viewport-fit=cover` in `index.html` for iOS safe area
- iOS safe area padding via `env(safe-area-inset-*)`
- `-webkit-tap-highlight-color: transparent` + `touch-action: manipulation` for responsive touch
- Navbar compact on mobile: Alpha badge hidden, sign-out shows icon only
- All modals → bottom sheet on mobile (`items-end`, `rounded-t-2xl`)
- `window.prompt()` replaced with inline textarea (blocked on mobile Safari)
- Notification dropdown: `fixed` positioning prevents overflow on 390–430px screens
- Dashboard tabs: `overflow-x-auto scrollbar-hide` horizontal scroll
- Filter selects: `flex-1 min-w-[130px]` — responsive
- All modals: `max-height: 90vh; overflow-y: auto`

---

## Round 16 — Alpha 0.2 Release

- Version badge updated to `α 0.2` (second alpha release)
- **Houses:** Renamed "Jal" → "Akash" across all forms and seed data
- **Sections:** Updated to XII A–G, XI A–G (7 sections per grade for senior school)
- **SLA badges** removed from student and council member complaint card view; visible to staff only
- **Raise Complaint:** Header + back button redesigned; clearer CTA and subtitle
- **Council dashboard:** Complaints now sorted by priority — overdue → urgent → in_progress → verified → raised. Council cannot escalate until after verifying (enforced). Student consent dialog always shown before revealing identity on escalation.
- **Current Handler display:** Now shows handler's actual name and designation (not just role label). Updates dynamically as complaint is escalated.
- **Teacher section filter:** Class teacher dashboard filters complaints by the teacher's own section if their section is set.
- **VOX-O6:** Supervisor role expanded to a 6-person oversight team (School President, Head Boy/Girl, Secretary Boys, Secretary Girls, Joint Secretary). Each gets a designated title displayed in the navbar. 5 new supervisor demo accounts added.
- **Suggestion Box:** New component on student dashboard — students can submit feature requests/bugs/ideas. Categorized by type. Supervisors/principal can view all submissions and update their status.
- **Notifications:** Fixed — all handlers are notified in-app when a complaint is escalated to their role. WhatsApp integration fixed: double `whatsapp:` prefix bug resolved, FROM number now lazily evaluated from env.
- **Search:** Fuzzy matching added to principal/coordinator dashboard — tolerates small typos and partial matches.
- **Upload fix:** Supabase Storage bucket auto-created if missing; improved error messages and retry button in FileUpload.
- **Performance:** Complaint cache extended to 30s; Railway keepalive ping every 4 minutes; DB indexes added for all frequently queried columns.
- **Seed data:** Student (Rahul) now has 7 diverse complaints in various statuses for demo. Seed updated with escalation and timeline records.
- **WhatsApp test endpoint:** `GET /api/test-whatsapp` — hit this from browser to verify Twilio integration without triggering a real event.

---

## Phase 3 — Advanced Features (Post-Alpha 0.2)

### Security Hardening (#51–#55)
- **JWT → HttpOnly cookie migration (#51):** Eliminated XSS token theft risk; all auth now via secure HttpOnly cookie + `withCredentials: true` on all Axios calls
- **Rate limiting + Helmet.js (#52):** `express-rate-limit` on all endpoints; `helmet()` for HTTP security headers; Zod schema validation on all request bodies
- **File upload security (#53):** EXIF metadata stripping on all image uploads; strict file type validation (image/pdf/docx only); max 10MB enforced
- **DOMPurify sanitisation (#54):** All user-submitted text sanitised server-side + client-side before render; prevents stored XSS
- **Supabase Storage signed URLs (#55):** All attachment access via time-limited signed URLs; bucket policy enforces private access

### POSH / POCSO Compliance (#49–#50)
- **Keyword auto-triage (#49):** POSH/POCSO keyword detection auto-routes to school IC members and coordinator, bypassing council member and class teacher entirely
- **Respondent type field (#50):** Complaint form asks whether complaint is against student, teaching staff, or non-teaching staff; routes differently for staff complaints

### DPDP Act 2023 Compliance (#59–#62)
- **Verifiable Parental Consent (#59):** First-login gate requires parent to complete OTP-verified consent flow; `is_privacy_acknowledged` and `vpc_status` tracked per student
- **Data erasure request (#60):** Students/parents can submit erasure requests; tracked in `erasure_requests` table; POSH/POCSO complaints are legal-hold exempt
- **Privacy notice gate (#62):** Age-appropriate plain-language consent screen shown at first login; consent timestamp recorded

### Additional Role Features
- **8th role: `vice_principal` and `board_member`** added to RBAC
- **External IC Member:** Statutory POSH requirement — dedicated role for external IC committee member
- **Respondent routing:** Staff-respondent complaints skip student council, go directly to coordinator

### Quality-of-Life Features (Large Batch)
- **Rich text editor (#12):** Markdown + formatting in complaint descriptions and resolution notes; DOMPurify on render
- **Hindi/English multilingual toggle (#11):** Full UI translation toggle; `useLanguage` context; all strings localised
- **Visual progress bar (#9):** Step indicator on `ComplaintDetail.jsx` showing lifecycle stage for students
- **CSAT survey (#10):** 1–5 star rating shown to student after complaint closure; stored in `complaints.feedback_rating`
- **Auto-save draft (#57):** Complaint form auto-saves to localStorage every 10s; restored on revisit
- **Quick exit button (#56):** Emergency exit in navbar — one click clears view
- **Childline / NCPCR crisis links (#58):** Persistent support links displayed on complaint forms and detail pages

### Analytics & Reporting (#13–#19)
- **FCR metric (#13):** First Contact Resolution rate in analytics dashboard
- **CSAT per handler (#14):** Per-council-member satisfaction scores
- **SLA breach rate (#15):** % complaints exceeding SLA shown in analytics
- **Domain heatmap (#16):** Complaints by domain over time
- **Escalation rate per handler (#17):** Which council members escalate most
- **Response time histogram (#18):** Time-to-first-action distribution
- **Export analytics to PDF/CSV (#19):** Downloadable reports for principal and supervisor

### Governance Features
- **Role-based delegation (#20):** Council member temporarily delegates their queue to a peer; `delegation_rules` table; `migration_delegation.sql`
- **Consensus voting (#21):** Multiple council members vote on sensitive/ambiguous complaints; `complaint_votes` table; `migration_consensus.sql`
- **Audit log viewer (#22):** Dedicated screen for principals showing full system audit trail
- **Meeting agenda generator (#23):** Auto-generates council meeting agenda from pending/escalated complaints
- **Term-limit tracking (#24):** Council tenure management; `term_start`, `term_end` on `users` table; `migration_term_limits.sql`

### Notifications (#25–#26)
- **Email notifications (#25):** Nodemailer SMTP — complaint assignment, escalation, resolution events
- **In-app notification bell (#26):** Real-time (60s polling) notification center in navbar; mark-as-read
- **Daily digest (#28):** `node-cron` job sends morning summary email to all handlers at 07:30 IST

### Safety & Compliance UX
- **Session timeout (#31):** Auto-logout after 30 minutes of inactivity
- **Data retention (#32):** Auto-archive trigger on complaints older than 2 years
- **PII masking (#33):** Student names redacted in all CSV/PDF exports
- **Formal printable complaint report (#35):** Institutional PDF-style report for council records
- **Consent logging (#30):** Formal consent record when council member chooses to reveal anonymous identity on escalation

---

## Phase 4 — AI Features & Smart Assignment

### AI Assistance (Tasks #37–#44)
- **Skills-based assignment (#37):** Route complaint to council member whose `domain_expertise` array contains the complaint domain; `migration_skills_assignment.sql` adds `domain_expertise TEXT[]` to users
- **Load-balanced assignment (#38):** `POST /api/complaints/:id/load-balance-assign` — picks council member with fewest open complaints (statuses: raised/verified/in_progress)
- **Round-robin assignment (#40):** `POST /api/complaints/:id/auto-assign` — cycles through all council members in deterministic rotation; `round_robin_index` persisted in `system_config` table; `migration_system_config.sql`
- **AI sentiment analysis (#41):** `client/src/utils/sentimentAnalyzer.js` — classifies complaint tone as distressed/frustrated/neutral/hopeful with confidence score; `SentimentBadge.jsx` shown to staff only
- **Auto-categorisation (#42):** `client/src/utils/domainClassifier.js` — keyword-based domain suggestions shown as clickable pills on `RaiseComplaint.jsx`
- **Spam / gibberish detection (#43):** `client/src/utils/spamCheck.js` — detects repeat characters, no whitespace, low vowel ratio; warning shown before submit on `RaiseComplaint.jsx`
- **Resolution templates (#44):** `client/src/utils/resolutionTemplates.js` — 3 pre-written templates per domain; `ResolutionSuggestions.jsx` shown to council members when resolving; one-click fill

### Knowledge Base (#34)
- `client/src/pages/KnowledgeBase.jsx` — `/help` route accessible to all roles
- Real-time search via `useMemo`; accordion FAQ with 3 sections and 13 answers
- Covers: raising complaints, anonymity, escalation, timelines, account management

---

## Phase 5 — Compliance Documentation

### Legal & Compliance Documents Added to Repository
- **`BREACH_RESPONSE.md`** — Full incident response playbook: detection, containment, DPDP Act notification timelines, post-incident review, email templates for affected students
- **`DPIA.md`** — Data Protection Impact Assessment under DPDP Act 2023: risk register, data mapping, privacy-by-design evidence, data subject rights implementation, third-party processor records
- **`migration_system_config.sql`** — DDL for `system_config` key-value store (round-robin index persistence)
- **`migration_skills_assignment.sql`** — DDL for `domain_expertise` column on `users`

---

## Deployment

| Service | URL |
|---------|-----|
| Frontend (Vercel) | https://vox-dpsi.vercel.app |
| Backend (Railway) | https://vox-dpsi-production-6d95.up.railway.app |
| Database (Supabase) | https://gznhziptmydkalsrazpj.supabase.co |
| WhatsApp (Twilio) | whatsapp:+14155238886 (sandbox) |

---

## Demo Accounts (password: `demo123`)

| Role | Email | Name | Designation |
|------|-------|------|-------------|
| Student | `5001@student.dpsindore.org` | Rahul Sharma | — |
| Council Member | `5002@student.dpsindore.org` | Priya Verma | — |
| Class Teacher | `teacher@dpsi.com` | Mrs. Sharma |
| Coordinator | `coordinator@dpsi.com` | Mr. Kapil |
| Principal | `principal@dpsi.com` | Mr. Parminder Chopra |
| Supervisor | `supervisor@dpsi.com` | Arrunabh Singh |
