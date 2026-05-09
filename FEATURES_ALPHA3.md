# Vox DPSI — Complete Feature List (Alpha 0.3)
### Last Updated: April 2026

---

## CORE SYSTEM

### Authentication & Roles
- JWT-based authentication with 7-day token expiry
- 6 role types: `student`, `council_member`, `class_teacher`, `coordinator`, `principal`, `supervisor`
- Role-based access control — each role sees only their relevant data
- Supabase row-level security enforces data access at the database layer
- Passwords hashed with bcrypt (never stored in plaintext)

### Complaint Lifecycle
- Sequential status flow: `raised` → `verified` → `in_progress` → `resolved / escalated_to_teacher` → `resolved / escalated_to_coordinator` → `resolved / escalated_to_principal` → `resolved / closed / appealed`
- Full immutable timeline — every status change logged with timestamp, actor, and optional note
- Complaint number format: `VOX-XXXX` (sequential, permanent, unique)

---

## STUDENT-FACING FEATURES

| Feature | Detail |
|---------|--------|
| **Raise a Complaint** | Single-form flow — domain selector, description (min 50 chars), optional attachment, anonymity toggle |
| **Domain Categories** | 6 domains: Academics (blue), Infrastructure (orange), Safety (red), Personal (purple), Behaviour (yellow), Other (grey) |
| **File Attachment** | Upload image/PDF/document — stored in Supabase Storage; image preview shown in complaint detail |
| **Anonymity Toggle** | Opt-in; council member always sees name but it's hidden from all higher handlers unless explicitly revealed |
| **Complaint Number** | Auto-generated `VOX-XXXX` shown on confirmation screen and in all status updates |
| **My Complaints List** | Full history with status badges and time elapsed |
| **Complaint Detail View** | Full description, attachment, current handler, status, and complete timeline |
| **Status Tracking** | Real-time status updates visible to student on their dashboard |
| **Post-Resolution Feedback** | After complaint is resolved, student can submit a feedback rating and comment |
| **Appeal System** | If student disagrees with resolution, they can file an appeal with a reason — goes to principal |
| **Suggestion Box** | Separate from complaints; student submits open-ended suggestion; anonymous by default |
| **Notification Bell** | In-app bell icon in navbar; unread count badge; notifications for every status change |

---

## COUNCIL MEMBER FEATURES

| Feature | Detail |
|---------|--------|
| **Personal Dashboard** | 4 stat cards: Assigned, Pending Verification, Escalated, Resolved |
| **Complaint List** | Auto-sorted: overdue (>48h) float to top with red glow; freshly assigned next |
| **Student Name Always Visible** | Council member always sees the student's real name, plus '(Anonymous Requested)' badge if applicable |
| **Complaint Handler View** | Full detail + context-aware action buttons based on current status |
| **Mark as Verified** | Confirms in-person meeting; required before escalation |
| **Mark as In Progress** | Signals active work |
| **Resolve** | Closes complaint with resolution note; student notified instantly |
| **Escalate** | Escalates to Teacher, Coordinator, or Principal directly |
| **Escalation Modal** | Pops up when escalating; shows anonymity consent dialog ('Reveal identity? YES / NO'); decision logged permanently |
| **Internal Notes** | Staff-only notes visible to all handlers but never to the student |
| **Performance Score Tab** | Personal score (0–100), resolution rate, avg time, domain breakdown, trend |
| **Deletion Request** | Flag a complaint as invalid/spam — triggers dual-approval (council → supervisor) for permanent deletion |

---

## CLASS TEACHER FEATURES

| Feature | Detail |
|---------|--------|
| **Escalated Complaints** | Sees only complaints escalated to teacher level; filtered to their section if section is set |
| **Anonymous Student Handling** | Name hidden if council member chose not to reveal; shows 'Anonymous Student' |
| **Resolve or Escalate** | Can resolve directly or push to Coordinator |
| **Internal Notes** | Can add staff-only notes |
| **Analytics Tab** | Key metrics (resolved, pending, resolution rate, avg time), domain breakdown bars, anonymity notice |

---

## COORDINATOR FEATURES

| Feature | Detail |
|---------|--------|
| **All Coordinator-Level Complaints** | Full list of complaints at their level |
| **Status + Domain Filters** | Filter by: New, In Progress, To Principal, Resolved; and by domain |
| **Complaint Count Badge** | Shows filtered vs total count |
| **Resolve or Escalate to Principal** | Final escalation path |
| **Internal Notes** | Add staff-only notes |
| **Analytics Tab** | Full AnalyticsDashboard: KPI cards, domain pie, status bars, 7-day trend, section breakdown, council leaderboard |

---

## PRINCIPAL FEATURES

| Feature | Detail |
|---------|--------|
| **Full System Visibility** | Every complaint in the system across all statuses and domains |
| **4 Headline Stat Cards** | Total Raised, Resolved, Pending, To Principal |
| **Fuzzy Search** | Search by complaint no, student name, scholar no, section, domain, description — tolerates 1-char typos |
| **Status + Domain Filters** | Dropdown filters for both; shows filtered/total count |
| **Export CSV** | One-click export of all complaints with all fields to .csv file |
| **Appeals Tab** | Review student appeals — Uphold or Reject with a review note; student notified of decision |
| **Analytics Tab** | Full AnalyticsDashboard (see below) |
| **Resolve with Note** | Can mark any complaint resolved with a resolution note; student notified |

---

## SUPERVISOR (VOX-O6) FEATURES

| Feature | Detail |
|---------|--------|
| **Shared Account — 6 Members** | One supervisor login shared by: School President, Head Boy, Head Girl, Secretary (Boys), Secretary (Girls), Joint Secretary |
| **Per-Session Identity** | On login, member selects their name; all notes/actions tagged to that individual |
| **Full System Visibility** | Sees everything the principal sees |
| **House Breakdown** | Complaints grouped by student's house: Prithvi, Vindhya, Akash, Narmada |
| **Section Breakdown** | Complaints grouped by class section |
| **Domain Summary** | Count per domain |
| **Appeals Tab (Read-Only)** | Monitors appeals filed and principal decisions; cannot intervene |
| **Deletion Requests Tab** | Reviews council-flagged deletion requests; approves or rejects (second approver in dual-approval system) |
| **Analytics Tab** | Full AnalyticsDashboard |
| **Add Notes** | Can add notes to any complaint for monitoring purposes |

---

## ANALYTICS DASHBOARD (All Staff Roles)

Powered by Recharts — no third-party analytics service required.

| Chart / Metric | Description |
|---------------|-------------|
| **KPI Strip** | Total raised, Resolved count + resolution rate %, Pending, Urgent count, Average resolution time in hours |
| **Domain Pie Chart** | Breakdown of all complaints by domain with colour coding |
| **Status Bar Chart** | Horizontal bars per status — shows where complaints are accumulating in the pipeline |
| **7-Day Trend Line** | Complaint volume per day for the past week — spots spikes |
| **Section Bar Chart** | Top 8 sections by complaint count — identifies which classes need attention |
| **Council Performance Leaderboard** | Horizontal bar chart per council member with colour-coded score (green ≥70, amber ≥40, red <40), plus detail cards showing resolved/active/overdue per member |

---

## BACKEND & INFRASTRUCTURE

| System | Detail |
|--------|--------|
| **Auto-Escalation Cron** | Runs every hour; automatically escalates any complaint unactioned for 48+ hours; logs the escalation in the timeline |
| **WhatsApp Notifications** | Powered by Twilio API; sent on: new assignment, verification, escalation, resolution, appeal filed/reviewed |
| **In-App Notifications** | Delivered to each handler when a complaint reaches their level; bell icon shows unread count; click to mark read |
| **Priority System** | Three levels: normal, high, urgent; auto-detection of urgent keywords in description (bullying, hurt, unsafe, emergency, threatening, scared) |
| **SLA Tracking** | 48-hour soft SLA for council members; displayed as elapsed time on complaint cards |
| **File Storage** | Supabase Storage bucket; public URLs; image preview in complaint detail |
| **JWT Auth** | 7-day tokens; stored in localStorage; automatically refreshed on valid requests |
| **Rate Limiting** | Express middleware on all API routes |
| **CORS** | Configured for Vercel frontend domain and local dev |

---

## DEPLOYMENT

| Platform | Service |
|----------|---------|
| **Frontend** | Vercel — auto-deploy from GitHub main branch |
| **Backend** | Railway — Node.js server; auto-deploy from GitHub main branch |
| **Database** | Supabase PostgreSQL — hosted, globally distributed |
| **File Storage** | Supabase Storage |
| **Notifications** | Twilio (WhatsApp Business API) |
| **Source Control** | GitHub — `Arrunabh-Singh/VOX-DPSI` |

**Monthly estimated cost at school scale:** < ₹500 (Supabase free tier + Railway Starter + Twilio pay-as-you-go)

---

## DEMO ACCOUNTS

| Role | Email | Password |
|------|-------|----------|
| Student (Rahul Sharma) | student@dpsi.com | demo123 |
| Council Member (Priya Verma) | council@dpsi.com | demo123 |
| Class Teacher (Mrs. Sharma) | teacher@dpsi.com | demo123 |
| Coordinator (Mr. Kapil) | coordinator@dpsi.com | demo123 |
| Principal (Mr. Parminder Chopra) | principal@dpsi.com | demo123 |
| Supervisor / VOX-O6 (Arrunabh Singh + team) | supervisor@dpsi.com | demo123 |

**Live URL:** https://vox-dpsi.vercel.app

---

*Built by Arrunabh Singh, XII B — Prithvi House — DPS Indore*
*Alpha 0.3 · April 2026*
