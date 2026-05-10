# VOX DPSI — Complete Feature Pitch Script (Alpha 0.3)
### For: Principal's Office · Principal & Vice Principal
### Presenter: Arrunabh Singh, XII B — Prithvi House
### Build: Alpha 0.3 · Live at https://vox-dpsi.vercel.app

---

> **SETUP BEFORE YOU WALK IN (5 min before):**
> - Open `https://vox-dpsi.vercel.app` on the large display/screen — full-screen Chrome, zoom at 100%
> - On your phone, keep these three tabs open and ready:
>   - Student login: `student@dpsi.com` / `demo123`
>   - Council login: `council@dpsi.com` / `demo123`
>   - Principal login: `principal@dpsi.com` / `demo123`
> - Have printed QR code for the URL ready to hand to the principal if they want to try on their phone
> - Login screen should be visible when they walk in

---

## ⏱ TIMING OVERVIEW

| Time | What You're Doing |
|------|------------------|
| 0:00 – 1:30 | The Problem — your personal story |
| 1:30 – 3:00 | Why existing systems fail |
| 3:00 – 4:00 | The Indore 311 moment |
| 4:00 – 5:30 | Introducing Vox DPSI — big picture |
| 5:30 – 16:00 | Full live demo — every feature |
| 16:00 – 17:30 | The institutional argument |
| 17:30 – 20:00 | The ask + close |
| 20:00+ | Q&A |

---

## PART 1 — THE PROBLEM *(0:00 to 1:30)*

> *Stand in the centre of the room. No slides, no screen. Just you.*

---

**"Sir, Ma'am — I want to start with a question.**

How many of you, when you were in school, had a complaint you never raised?

Not because you didn't care. But because you didn't know *who* to tell, or you were afraid it would come back to you.

I've been at DPS Indore for seven years. And I can tell you — that silence is everywhere. Students complain to each other in corridors. They post on social media. They carry frustration for an entire year because there is no official, safe, accountable channel between them and the people who can actually fix things.

That gap — between what a student experiences and what the administration knows — is the problem I want to solve today."**

---

## PART 2 — WHY EXISTING SYSTEMS FAIL *(1:30 to 3:00)*

**"When I raised this in my earlier rounds, I talked about ballot boxes and class representatives. Both have the same fatal flaw: no transparency, no verification, no audit trail.**

A complaint in a box disappears. A complaint to a CR gets forgotten. Nobody follows up. Nobody knows if it was acted on. The student never finds out what happened.

The result is that students stop bothering. They assume nothing will change. And the administration is left making decisions without knowing what students actually experience every day.

That is an institutional failure. And it's entirely solvable."**

---

## PART 3 — THE MOMENT OF INSPIRATION *(3:00 to 4:00)*

> *Slow down here. This is personal.*

**"Three months ago, there was no water supply in my colony for two days. My father told me to open Indore 311 — the city's grievance app. I filed a complaint in two minutes. Got a complaint number. Got a status update within 48 hours.

I sat there thinking: *Why does the city of Indore have a better grievance system for 35 lakh residents than DPS Indore has for 2,000 students?*

That's when I stopped thinking about boxes and started thinking about software."**

---

## PART 4 — INTRODUCING VOX DPSI *(4:00 to 5:30)*

> *Now walk to the screen. Log out if needed — keep the Login page visible.*

**"Ladies and gentlemen — this is Vox DPSI."**

> *Gesture to the screen.*

**"Vox — from the Latin word for 'voice'. DPSI — Delhi Public School Indore. The voice of DPS Indore.**

This is a full-stack web application I built from scratch. It runs on any browser — phone, tablet, laptop — no install required.

It has six roles. Six different people, six different views, one connected system:
- **Student** — raises complaints, tracks status
- **Council Member** — receives, verifies, escalates
- **Class Teacher** — handles escalations from their section
- **Coordinator** — system-wide oversight, escalates to principal
- **Principal** — full visibility, resolves at the highest level, reviews appeals
- **Supervisor** — that's our VOX-O6 team: School President, Head Boy, Head Girl, and the four secretaries

Every complaint travels through a structured ladder. Every action is timestamped. Everything is logged. Nothing disappears.

Let me show you how it works — live."**

---

## PART 5 — COMPLETE LIVE DEMO *(5:30 to 16:00)*

---

### DEMO 1: Student Logs In *(5:30 – 7:00)*

> *Log in as student on the big screen.*
> *Credentials: `student@dpsi.com` / `demo123`*

**"I'm playing Rahul Sharma, Scholar No. 5001, Class XII B.**

This is the student dashboard. At the top: a welcome card with his name and scholar number. Below: his full complaint history with status badges. He can see at a glance what's raised, what's in progress, what's resolved.

The big green button says 'Raise a Complaint.' That's the entire flow — one tap."**

---

### DEMO 2: The Complaint Form — Every Field *(7:00 – 9:00)*

> *Click "Raise a Complaint"*

**"Now let's look at this form. This is where the intelligence of the system starts.**

**Domain selection** — six categories, each with an icon and colour:
- 📚 Academics (blue) — syllabus, teaching quality, exams
- 🏗️ Infrastructure (orange) — broken equipment, maintenance, facilities
- 🛡️ Safety (red) — bullying, physical hazards, emergency concerns
- 👤 Personal (purple) — interpersonal issues, mental health concerns
- ⚠️ Behaviour (yellow) — misconduct, disciplinary matters
- 📋 Other (grey) — anything that doesn't fit

I'll select Infrastructure — there's a broken fan in our classroom.

**Description** — minimum 50 characters. The system won't let you submit a vague one-liner. It forces the student to be specific.

**File attachment** — optional. A student can photograph the broken fan and attach it directly. The image is stored securely in the cloud.

**The Anonymity Toggle** — this is the most important field on this form."**

> *Toggle it on.*

**"When this is on, the student is telling the system: 'I trust my council member, but I don't want anyone above them to know who I am unless I agree.'**

Read the fine print the system shows: *'Your name will still be visible to your assigned council member. Anonymity applies to further escalations only.'* We're honest about it.

Let me submit."**

> *Submit. Show the VOX-XXXX confirmation screen.*

**"VOX-0008. That's the complaint number. Unique, permanent, traceable. Just like an Indore 311 number. The student can screenshot this and check it any time."**

---

### DEMO 3: Priority Detection *(one slide — 30 sec)*

> *This is a talking point, not a click. Reference it from the form.*

**"One more thing on that form — the system watches your description as you type. If you write words like 'bullying', 'hurt', 'unsafe', 'emergency', or 'threatening', it automatically flags the complaint as Urgent. The council member sees the red URGENT badge and knows to act immediately. No configuration needed — it's built into the text analysis."**

---

### DEMO 4: Council Member Dashboard *(9:00 – 11:00)*

> *Log out → log in as council member: `council@dpsi.com` / `demo123`*

**"Now I'm Priya Verma — council member for XII A.**

Top row: four stat cards — Assigned to me, Pending Verification, Escalated, Resolved. At a glance, I know where I stand.**

Below: my complaint list. Each card shows the complaint number, the student's name — and here, next to Rahul's name, a badge: 'Anonymous Requested'. I always see the name. But I know not to share it further.

Each card also shows a timer — how long since this was raised. Overdue complaints (more than 48 hours) glow in red. The list auto-sorts: overdue complaints float to the top.

I also have a **Personal Performance Score**."**

> *Click on any council member complaint to show the handler view.*

**"This is the handler view. I can see the full complaint, the description, the attachment if any.

My action buttons change based on the complaint's current status — I don't see every button at once, only what's appropriate right now:
- **Mark as Verified** — I've met Rahul in person and confirmed this is genuine
- **Mark as In Progress** — I'm actively working on it
- **Resolve** — I've fixed it myself; I write a resolution note
- **Escalate** — it's beyond my authority"**

> *Click "Escalate to Class Teacher"*

**"Now watch what happens."**

> *The Escalation Modal opens.*

**"The system pops up a modal: 'This student requested anonymity. Do you want to reveal their identity to the next handler?'**

I choose NO. The complaint goes forward with just the complaint number. The class teacher will see 'Anonymous Student.' Rahul's name never leaves this level.

If I had chosen YES — it gets logged. Permanently. The principal can always see that decision was made, when, and by whom. The anonymity system isn't just a UI trick — it's auditable."**

---

### DEMO 5: Performance Score *(11:00 – 11:45)*

> *Go back to the council member dashboard → Analytics tab.*

**"This council member dashboard also has an Analytics tab.**

It shows my personal performance score — a number from 0 to 100. Calculated from:
- How many complaints I've resolved
- My resolution rate as a percentage
- Minus a penalty for every overdue complaint (unresolved past 48 hours)

I can see my trend over time, my domain breakdown — which categories I handle most — and comparisons.

This is what makes the Student Council accountable. Every member's performance is visible — to the principal, to the supervisor, and eventually, to themselves."**

---

### DEMO 6: Class Teacher Dashboard *(11:45 – 12:30)*

> *Log out → `teacher@dpsi.com` / `demo123`*

**"Mrs. Sharma — class teacher. The complaint just arrived at her level.**

She sees: complaint number, category, description. She does NOT see 'Rahul Sharma'. She sees 'Anonymous Student' — because the council member chose not to reveal.

She has the same set of actions: Resolve here, or Escalate to Coordinator. And she can add an Internal Note — only visible to staff, never to the student — to document what she did."**

---

### DEMO 7: Coordinator Dashboard *(12:30 – 13:15)*

> *Log out → `coordinator@dpsi.com` / `demo123`*

**"Mr. Kapil — Coordinator view.**

He sees ALL complaints that have reached his level — filtered by status or domain. Four stat cards at the top. Tabs: Complaints and Analytics.

In the Analytics tab — the full AnalyticsDashboard:
- A pie chart of complaints by domain — is Infrastructure the biggest category?
- A bar chart of complaints by current status
- A 7-day trend line — is the complaint volume going up or down?
- A section breakdown — which class sections are generating the most complaints?
- And the council member performance leaderboard at the bottom

This is the coordination layer. Every decision here is logged."**

---

### DEMO 8: Principal Dashboard — Full Power *(13:15 – 15:00)*

> *Log out → `principal@dpsi.com` / `demo123`*
> *Invite the actual principal to log in on their phone.*

**"Sir — this is yours.**

Four headline numbers: Total Raised, Resolved, Pending, To Principal. The most important numbers in one glance.

Three tabs across the top: **Complaints, Appeals, Analytics.**

**Complaints tab:**
The full complaint list — every single one in the system. You can filter by Status and Domain. And you have a search bar — search by student name, complaint number, section, keyword in the description. Fuzzy search, so even a small typo will still find the right result.

Top-right corner: the **Export CSV button**. One click downloads every complaint — date, domain, status, student, section — to a spreadsheet. For your records. For governance reporting. For board meetings.

**Appeals tab:**
When a student disagrees with a resolution, they can file an appeal. It comes directly to you with the complaint number, the student's reason, and two buttons: Uphold or Reject. You add a note and submit. The student is notified immediately. This is the final layer of fairness in the system.

**Analytics tab — this is the most powerful view in the system.**"**

> *Click Analytics tab.*

**"Five KPI cards: Total, Resolved, Pending, Urgent, Average Resolution Time in hours.**

Then charts:
- Domain pie — where are complaints coming from?
- Status bar — where are complaints getting stuck in the pipeline?
- 7-day trend line — is complaint volume seasonal?
- Section bar chart — which class is generating the most complaints?
- Council Member Performance Leaderboard — who is resolving quickly, who is overdue?

Sir — this is institutional intelligence. After one full academic year of use, you will know more about the day-to-day experience of your students than any suggestion box has ever told any principal. And it builds automatically. Every day."**

---

### DEMO 9: Supervisor Dashboard (VOX-O6) *(15:00 – 16:00)*

> *Log out → `supervisor@dpsi.com` / `demo123`*

**"Finally — the Supervisor view. This is the School President login, shared by our entire VOX-O6 team: School President, Head Boy, Head Girl, and the four secretaries.**

When any of us log in, we first select our name — 'Arrunabh Singh', 'Ishaan Mehta', 'Kavya Reddy', and so on. Every note, every action we take in the system is tagged with that member's name. So even with a shared account, every action is attributed correctly.

As Supervisor, I see everything the principal sees — plus:
- A per-house breakdown: how many complaints from Prithvi, Vindhya, Akash, Narmada
- A per-section breakdown
- A domain summary
- Access to all appeals and deletion requests

There's also a Deletion Requests tab — when a council member flags a complaint as invalid or spam, they raise a deletion request. I review it here as the second approver. Only after I approve does the complaint get permanently removed. No single person can delete a complaint unilaterally. That's the safeguard.

Supervisor view is read-only for complaints — I cannot change statuses. I can add notes to any complaint, and monitor the system. Accountability, not interference."**

---

## PART 6 — SUPPORTING SYSTEMS *(spoken, not demo'd)*

> *Step back from the screen. Face the panel.*

---

**"I want to quickly mention the supporting infrastructure — because it's what makes this system reliable, not just impressive.**

**WhatsApp Notifications.** When a complaint reaches a new handler — council member, teacher, coordinator, principal — they receive a WhatsApp message automatically. No one has to check the app to know something needs their attention. The system comes to them.

**Auto-Escalation.** If a complaint sits unactioned for 48 hours, the system automatically escalates it to the next level. No complaint can be silently ignored. The timer enforces accountability without any human having to follow up.

**In-App Notification Bell.** Every user has a notification bell in the top bar. When their complaint moves — verified, escalated, resolved — the student gets an in-app notification instantly. They never have to wonder what's happening.

**Suggestion Box.** Separate from complaints — students can submit open-ended suggestions for the school or the student council. These don't follow the escalation ladder; they go directly to the council for review. Anonymous by default.

**Data Security.** The database is hosted on Supabase — ISO 27001 certified, row-level security enforced. Students can only see their own complaints. Council members only see complaints assigned to them. No one can access data they're not authorised for. The whole system runs on Vercel and Railway — enterprise-grade cloud hosting."**

---

## PART 7 — THE INSTITUTIONAL ARGUMENT *(16:00 to 17:30)*

**"I want to address the question you might be forming right now.**

*What stops students from abusing this — filing false complaints?*

Every complaint must be verified in person by a council member before it progresses anywhere. A complaint that can't be verified gets closed. That gate is enforced by the system — you can't escalate something unverified.

*What about a complaint against a teacher?*

That complaint escalates through the coordinator and principal directly. The teacher is never in the chain. The student's identity is protected. The principal sees it and takes action.

*Who maintains this when you graduate?*

The entire codebase is on GitHub with full documentation. Any developer — student or external — can maintain it. I will personally hand it over to the next council with onboarding documentation. The data lives on Supabase, not on my machine or anyone else's.

*What does it cost?*

Less than ₹500 per month at full school scale. No server. No hardware. No IT department required."**

---

## PART 8 — THE CLOSE *(17:30 to 20:00)*

> *Stand in the centre of the room. This is your close. Slow down.*

---

**"Seven years ago, I joined this school as a student. Today, I'm asking to serve it as its School President.**

My vision for the Student Council is not events and spirit weeks alone. It's accountability. It's giving every student — from Class VI to Class XII — a safe, structured, dignified way to be heard. And giving the administration real data about what those students actually experience.

Vox DPSI is not a pilot project. It is not a concept. It is not a prototype. It is live. It is deployed. Every one of you can open it on your phone right now and see a real, working system.

I'm not asking you to approve a proposal. I'm asking you to approve a deployment.

If I am elected School President, I want to formally launch this for Class XII in Term 1, evaluate the results, and present a data-driven report to the administration by December. The metrics will speak for themselves.

The question is not whether DPS Indore needs this.

The question is: *when.*

I believe the answer is now. And I believe you believe that too.

Thank you."**

> *Stand still. Don't touch the screen. Don't add anything.*
> *Let the silence sit for 3 full seconds before inviting questions.*

---

## ANTICIPATED QUESTIONS

**Q: How long did this take to build?**
> "About three weeks of focused work — evenings and weekends. I used React for the frontend, Node.js for the backend, Supabase for the database. The same stack used by Notion, Linear, and hundreds of startups. I built it without any pre-built template or paid service — it's original code."

**Q: What if the internet is down at school?**
> "The core data is loaded into the browser when you open the app — so recently-loaded data stays visible even offline. Any actions taken while offline are queued and sync when connectivity returns. For this reason, the student dashboard loads in under a second once cached."

**Q: Can this be misused by council members?**
> "Every action a council member takes is logged permanently — who they escalated to, whether they revealed a student's identity, whether they closed a complaint without verification. The principal can audit every council member's actions in full. Misuse is visible and traceable."

**Q: What about students in lower classes who may not have smartphones?**
> "Any device with a browser works — school computers, tablets, parents' phones. The interface is responsive and works on all screen sizes. There's also no minimum age restriction in the system — any student with a login can use it."

**Q: What happens to data after a student graduates?**
> "Complaints are retained in the system for the principal's records and for institutional learning. A student's personal account is archived. The historical data — complaint patterns, resolution rates, domain trends — remains available to the administration indefinitely."

**Q: Have you tested this with real students?**
> "The system has been tested with real accounts and a realistic dataset including 22 complaints across all statuses and all 6 domains. The demo you just saw was live — not a recording, not a mock-up. Every action I performed was real."

**Q: How is student data protected?**
> "Supabase uses row-level security — each user can only read and write their own data. Passwords are hashed using bcrypt before storage. The database is never directly accessible to the frontend. All API calls require a valid login token."

---

## FEATURE REFERENCE CARD *(for your own notes — not for reading aloud)*

| Feature | Where It Lives |
|---------|---------------|
| Complaint raising with domain + anonymity + file upload | Student dashboard |
| Auto-priority detection (urgent keyword scanning) | Complaint form |
| Real-time status tracking with complaint number | Student dashboard |
| Council member performance score (0–100) | Council dashboard → Analytics |
| Overdue complaint highlighting + auto-sort | Council dashboard |
| Escalation modal with anonymity consent + audit log | Council complaint handler |
| Internal notes (staff-only) | Any complaint detail page |
| Fuzzy full-text search | Principal dashboard |
| Filter by status + domain + section | Coordinator + Principal |
| Export complaints to CSV | Principal dashboard |
| Appeals system (student files → principal reviews) | Principal → Appeals tab |
| Deletion request dual-approval (council + supervisor) | Supervisor → Deletions tab |
| Per-role analytics with recharts | Council, Teacher, Coordinator, Principal, Supervisor |
| 7-day complaint trend line | Analytics dashboard |
| Council member leaderboard with scores | Analytics dashboard |
| WhatsApp notifications on escalation | Automatic (Twilio) |
| In-app notification bell | All logged-in users |
| Auto-escalation after 48h SLA | Backend cron job |
| Suggestion Box (separate from complaints) | Student dashboard |
| VOX-O6 shared account with per-member attribution | Supervisor login |
| Full timeline audit trail | Every complaint detail |
| Role-based access control (6 roles) | Entire system |
| JWT authentication with secure token | Login system |
| Supabase row-level security | Database layer |

---

## CLOSING NOTES

- **If the page loads slowly on first open:** It's the backend spinning up on Railway — takes 5–7 seconds. Reload once. After that it's fast.
- **If a login fails:** Double-check the email — it's `@dpsi.com` not `@dpsindore.org` in the demo accounts.
- **Speak 30% slower than you think you need to.** The app does the selling. Your job is narration, not excitement.
- **You have already won the technical argument** the moment they see it's live. Everything after that is about institutional fit.
- **If they ask a question you don't know the answer to:** "That's a great point — I'd want to research the right answer and come back to you rather than guess." That's more impressive than winging it.

---

*You built a real system. Walk in like someone who knows that.*

*Good luck.*
