# Vox DPSI — Non-Technical Changelog
### Alpha 0.3 Release · April 2026

---

## What's New in Alpha 0.3

This release focused on making the system ready for the Principal's round — with richer data, full analytics across all roles, performance optimizations, and a complete supervisor infrastructure.

---

### Analytics for Every Role

**What changed:** Every staff role — Class Teacher, Coordinator, Principal, Supervisor — now has a dedicated Analytics tab in their dashboard.

**What it shows:**
- Coordinator and Supervisor: the full analytics suite — complaint volume trend for the past week, domain breakdown pie chart, status pipeline bar chart, section heatmap, and the council member performance leaderboard with scores.
- Teacher: a simpler panel showing their resolution rate, average resolution time, domain breakdown for their cases, and an anonymity notice if any cases involve anonymous students.
- Principal: unchanged full analytics suite, now memoized for faster rendering.

**Why it matters:** Previously, only the Principal and Supervisor had analytics. Now every handler at every level can see the health of the system from their vantage point.

---

### Council Member Performance Leaderboard

**What changed:** The Principal and Supervisor analytics dashboards now prominently feature a bar chart and detail card grid ranking every council member by their performance score.

**Score calculation:** (Resolved ÷ Total) × 100 − (Overdue complaints × 10). Green if ≥70, amber if ≥40, red if below 40.

**Why it matters:** The principal can see at a glance which council members are performing and which need support — without having to manually count resolved complaints.

---

### Performance Optimizations

**What changed:** The entire frontend was optimized to reduce unnecessary re-renders.
- All expensive filter and sort operations are now memoized — they only re-run when the underlying data actually changes.
- The search bar in the Principal's dashboard now has a 200ms debounce — the search algorithm only runs after you pause typing, not on every keystroke.
- The AnalyticsDashboard's chart aggregations are now computed once per data load, not on every render.

**What this means for you:** The app should feel noticeably snappier, especially on the Principal dashboard with a large number of complaints.

---

### Rich Seed Data for Demo

**What changed:** The demo database now contains 21 users and 22 complaints across every status, domain, and handler combination. Every analytics chart will show real data. Every dashboard will look populated and informative.

**Specific additions:**
- 15 background students with realistic names and sections
- Complaints in every status: raised, verified, in-progress, escalated to all 4 levels, resolved, closed, appealed
- 70+ timeline entries across all complaints
- 4 escalation records with reasons
- 1 active appeal filed by a student
- 9 notification records

---

### GitHub Push

**What changed:** All Alpha 0.3 code committed and pushed to `Arrunabh-Singh/VOX-DPSI` on GitHub. The commit is tagged `feat: Alpha 0.3`.

---

## Previously in Alpha 0.2

*(For reference — features that were already live before this release)*

- **VOX-O6 shared supervisor account** — 6 named members, per-session identity selection
- **Complaint deletion dual-approval** — council flags, supervisor approves
- **Auto-escalation cron job** — complaints escalate automatically after 48 hours
- **WhatsApp notifications via Twilio** — handlers notified on escalation, resolution, appeal
- **In-app notification bell** — per-user unread count, mark-all-read
- **Suggestion Box** — student-facing, anonymous-by-default
- **Post-resolution feedback** — student rates and comments after resolution
- **Appeal system** — student appeals resolution; principal reviews with Uphold/Reject
- **Internal Notes** — staff-only notes on any complaint, never visible to students
- **Priority system** — normal / high / urgent; auto-detect from description keywords
- **SLA timer display** — hours elapsed shown on complaint cards
- **Section-filtered teacher dashboard** — teacher only sees their class section's complaints
- **Fuzzy search in Principal dashboard** — tolerates typos, searches all fields
- **CSV export** — one-click download of all complaints for reporting
- **Mobile optimization** — responsive layout for phones and tablets

---

## Previously in Alpha 0.1

*(Foundational features)*

- JWT authentication with 6-role system
- Full escalation ladder: student → council → teacher → coordinator → principal
- Anonymity system with council-controlled reveal and audit log
- File attachment (image/PDF/document) via Supabase Storage
- Complaint timeline — immutable, timestamped, full audit trail
- VOX-XXXX complaint numbering
- Complaint domain categories with colour coding
- Status badges with colour coding
- Council member assignment
- Skeleton loading states across all dashboards
- Glass-morphism UI with DPS Indore brand colours (forest green + gold)
- Deployed to Vercel (frontend) + Railway (backend) + Supabase (database)

---

*Built by Arrunabh Singh, XII B — Prithvi House*
*vox-dpsi.vercel.app*
