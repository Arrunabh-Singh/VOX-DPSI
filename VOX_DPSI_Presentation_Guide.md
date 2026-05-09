# VOX DPSI — Presentation Guide & PPT Material
### Built by Claude · Designed for Delhi Public School Indore · Demo: [vox-dpsi.vercel.app](https://vox-dpsi.vercel.app)

---

## What Was Built

**Vox DPSI** is a full-stack student grievance management system — a real, working web application deployed live on the internet. It was designed and coded entirely by Claude based on the spec you provided, then deployed to Vercel (frontend) and Railway (backend) with a live Supabase PostgreSQL database.

Think of it as **Indore 311 for DPS Indore** — students raise complaints, council members handle them, and the system escalates up through teachers, coordinators, and the principal with a full audit trail.

**Live URL:** `https://vox-dpsi.vercel.app`  
**Samsung Galaxy Tab S9 FE+:** Open Chrome → go to `vox-dpsi.vercel.app` → add to Home Screen

---

## Screenshots

### Screen 1 — Login Page
![Login](./screenshots/01_login.png)

- DPS Indore logo + **VOX DPSI** brand (navy + gold)
- 6 one-tap demo account buttons — no typing needed for the demo
- All passwords: `demo123`
- "Powered by DPS Indore Student Council" footer

---

### Screen 2 — Student Dashboard
![Student Dashboard](./screenshots/02_student_dashboard.png)

- Personal welcome header: name, scholar number, section
- Giant gold **+ Raise a Complaint** CTA button
- All past complaints listed as cards: complaint number (VOX-0001), domain badge, status pill, timestamp
- Status legend at the bottom

---

### Screen 3 — Raise a Complaint Form
![Raise Complaint](./screenshots/03_raise_complaint.png)

- 6 domain category tiles: Academics, Infrastructure, Safety, Personal, Behaviour, Other
- Description textarea with 50-character minimum validation
- Optional file attachment (image / PDF / doc)
- **Anonymity toggle** — unique feature: "Your name will still be visible to your council member. Anonymity applies to further escalations only."

---

### Screen 4 — Complaint Detail & Timeline
![Complaint Detail](./screenshots/04_complaint_detail.png)

- Complaint number (VOX-0003) with domain and status at a glance
- Full description
- Complete **Activity Timeline** — every action logged with timestamp and actor name
- Council member's field notes ("Inspected location. Tile is cracked and hazardous. Photographed the area.")

---

### Screen 5 — Council Member Dashboard
![Council Dashboard](./screenshots/05_council_dashboard.png)

- Stats row: Assigned (4) / Need Verification (0) / Escalated (1) / Resolved (1)
- All assigned complaints shown in a grid
- **"Anon Requested"** badges shown clearly — council always sees the real name
- Filter tabs: All / Raised / Verified / In Progress / Escalated / Resolved

---

### Screen 6 — Principal's Dashboard
![Principal Dashboard](./screenshots/06_principal_dashboard.png)

- Full system overview: Total Raised (4) / Resolved (1) / Pending (3) / To Principal (0)
- All complaints visible across the entire school
- Status and domain filter dropdowns
- **Export CSV** button for records

---

## PPT Slide Content

Copy the content below directly into your PowerPoint slides.

---

### SLIDE 1 — Title Slide

```
VOX DPSI
Student Grievance Management System
Delhi Public School Indore

Presented by: [Your Name]
Student Council Presidential Interview
```

---

### SLIDE 2 — The Problem

```
EVERY SCHOOL HAS GRIEVANCES.
MOST GO UNHEARD.

• Students don't know who to approach
• No accountability once a complaint is raised
• Identities at risk when escalating to teachers
• No record of what happened or when
• Council members have no structured workflow

There is no system. There should be.
```

---

### SLIDE 3 — The Inspiration

```
INDORE 311 — FOR DPS INDORE

Indore's citizen grievance platform lets residents
raise complaints, track resolution, and hold the
administration accountable.

VOX DPSI applies the same model to our school:
students raise issues → assigned to council →
escalated with full audit trail → resolved.

"Vox" = Latin for "voice." Every student deserves one.
```

---

### SLIDE 4 — What is Vox DPSI?

```
A LIVE, WORKING WEB APPLICATION

→ Students raise complaints by category
→ Council members verify and handle them
→ Complex issues escalate to teachers, coordinator, principal
→ Full timeline of every action, by every person, at every step
→ Built-in anonymity protection
→ Runs on any browser — including this tablet

Live at: vox-dpsi.vercel.app
```

---

### SLIDE 5 — The 6 Roles

```
ROLE-BASED ACCESS FOR EVERY STAKEHOLDER

1. Student        — raises and tracks their own complaints
2. Council Member — first responder, verifies in person
3. Supervisor     — senior council oversight (House/School President)
4. Class Teacher  — receives escalations from council
5. Coordinator    — mid-level escalation handler
6. Principal      — full system visibility, final authority

Each role sees only what they need to see.
```

---

### SLIDE 6 — The Anonymity System

```
PRIVACY-FIRST DESIGN

The problem: students fear retaliation when naming teachers.

Our solution:
✓ Student can request anonymity at submission
✓ Their council member always sees the real name
  (to verify the complaint in person)
✓ When escalating to a teacher or above, the council
  member decides: reveal identity or keep anonymous?
✓ Decision is logged permanently in the timeline
✓ Principal can request identity reveal through coordinator

This is not a workaround. It is the policy, built into the system.
```

---

### SLIDE 7 — Complaint Flow

```
HOW A COMPLAINT MOVES THROUGH THE SYSTEM

RAISED
  ↓ Council member meets student in person
VERIFIED
  ↓ Council member begins work
IN PROGRESS
  ↓ If unresolved — escalate
ESCALATED TO TEACHER
  ↓
ESCALATED TO COORDINATOR
  ↓
ESCALATED TO PRINCIPAL
  ↓
RESOLVED / CLOSED

Every step is timestamped. Nothing disappears.
```

---

### SLIDE 8 — Live Demo

```
[DEMO ON TABLET]

1. Login as Student → raise a complaint (Infrastructure, anonymous)
2. Login as Council Member → see complaint + "Anon Requested" badge
3. Verify in person → escalate (hide identity)
4. Login as Coordinator → see anonymous complaint
5. Login as Principal → full system overview

URL: vox-dpsi.vercel.app
All passwords: demo123
```

---

### SLIDE 9 — Technical Stack

```
BUILT WITH PRODUCTION-GRADE TECHNOLOGY

Frontend    React + Vite + Tailwind CSS → Vercel
Backend     Node.js + Express (REST API) → Railway
Database    Supabase (PostgreSQL) — hosted, managed
Auth        JWT with role-based access control
Storage     Supabase Storage for file attachments
Design      DPS brand colours: Navy #003366, Gold #FFD700

GitHub: github.com/Arrunabh-Singh/VOX-DPSI
```

---

### SLIDE 10 — Why This Matters

```
THIS IS NOT A CONCEPT. IT'S WORKING TODAY.

Any DPS Indore student can go to vox-dpsi.vercel.app
right now and raise a complaint.

The Student Council would own this system.
We would be the interface between students and administration.
We would have data. We would have accountability.

That is what real student leadership looks like.

VOX DPSI — Because every voice deserves a number.
```

---

### SLIDE 11 — Closing Slide

```
VOX DPSI

vox-dpsi.vercel.app
github.com/Arrunabh-Singh/VOX-DPSI

[Your Name]
Student Council Presidential Candidate
Delhi Public School Indore
```

---

## Design Decisions (Claude's Rationale)

These are the choices made during design — useful to explain if the principal asks.

**Why navy and gold?**  
These are DPS Indore's official brand colours. The app looks like it belongs to the school, not like a student project.

**Why 6 separate role dashboards?**  
Each role has a different job. A principal seeing every action button would be confusing. A student seeing escalation controls would be alarming. Role-based views are standard in enterprise systems for this reason.

**Why does the council member always see the student's name even when anonymity is requested?**  
The council member needs to meet the student in person to verify the complaint. Without knowing who it is, verification is impossible. Anonymity only protects the student from teachers and above — the people with institutional power over them.

**Why the timeline/audit trail?**  
Grievance systems fail when there is no accountability. "Who did what, when?" should never be a question. Every action — including the decision to reveal or hide a student's identity — is permanently logged.

**Why Supabase instead of a local database?**  
The system is designed to be used on any device, from any location. A cloud-hosted PostgreSQL database means the data is always accessible, backed up, and secure.

**Why make it tablet-optimised?**  
DPS Indore would most naturally demo this on a school tablet. The layout is fixed at 1280px wide, the touch targets are large, and there is no horizontal scroll anywhere.

---

## Setting Up on Samsung Galaxy Tab S9 FE+

1. Open **Chrome** on the tablet
2. Go to `https://vox-dpsi.vercel.app`
3. Tap the three-dot menu → **Add to Home Screen** → name it "Vox DPSI"
4. It will appear as an app icon on your home screen
5. Tap it — it opens in full-screen mode (no browser chrome)

**Optimal display settings:**
- Rotate to **landscape** mode
- Set Chrome display size to **100%** (Settings → Accessibility → Display size)
- The app is designed for 1280px width — fits the S9 FE+ landscape screen perfectly

**Demo mode checklist:**
- [ ] Open vox-dpsi.vercel.app
- [ ] Test Student login (demo123)
- [ ] Test Council login (demo123)  
- [ ] Test Principal login (demo123)
- [ ] Confirm complaints are showing (VOX-0001 through VOX-0004)
- [ ] Keep this URL open in a second tab as backup: `vox-dpsi.vercel.app/login`

---

## Demo Accounts Quick Reference

| Role | Email | Password |
|------|-------|----------|
| Student | `5001@student.dpsindore.org` | `demo123` |
| Council Member | `5002@student.dpsindore.org` | `demo123` |
| Class Teacher | `sharma@staff.dpsindore.org` | `demo123` |
| Coordinator | `kapil@staff.dpsindore.org` | `demo123` |
| Principal | `principal@dpsindore.org` | `demo123` |
| Supervisor | `5411@student.dpsindore.org` | `demo123` |

Or use the **one-tap demo buttons** on the login screen — no typing needed.

---

## 3-Minute Demo Script

**0:00** — Open `vox-dpsi.vercel.app` on the tablet. Show the login page.  
*"This is Vox DPSI — a student grievance system I built for DPS Indore."*

**0:20** — Tap **Student**, hit Sign In. Show the dashboard with existing complaints.  
*"Every student has a personal dashboard. They can see all their complaints and their current status."*

**0:40** — Tap **+ Raise a Complaint**. Select Infrastructure. Toggle anonymity on.  
*"When raising a complaint, students can request anonymity. Their council member still sees their name — to meet them in person — but their identity is hidden from teachers and above."*

**1:00** — Sign out. Log in as **Council**. Show the Council Dashboard.  
*"The council member sees all complaints assigned to them. Notice the 'Anon Requested' badge — they know, but teachers won't unless the council chooses to reveal it."*

**1:30** — Click into a complaint. Show the timeline.  
*"Every action is logged. Every person. Every timestamp. No complaint falls through the cracks."*

**1:50** — Sign out. Log in as **Principal**.  
*"The principal sees the full school-wide view — total raised, resolved, pending — with export to CSV for records."*

**2:20** — Close the tablet. Look at the principal.  
*"This system is live today. Any student at DPS Indore can use it. If I become Student Council President, this is how we will make sure every voice is heard — and acted on."*

**2:40** — Leave the URL on screen: `vox-dpsi.vercel.app`

---

*Document generated by Claude · Vox DPSI v1.0 · April 2026*
