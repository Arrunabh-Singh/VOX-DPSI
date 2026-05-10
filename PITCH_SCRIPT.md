# VOX DPSI — 15-Minute Presidential Interview Pitch Script
### Coordinator Round | Principal · Vice Principal · Head of CS
### Presenter: Arrunabh Singh, XII B — Prithvi House

---

> **SETUP BEFORE YOU WALK IN:**
> - Open `https://vox-dpsi.vercel.app` on the 75" touchscreen in full-screen Chrome
> - Write these 3 login links on the whiteboard or have them as a QR code printout:
>   - **Student:** `5001@student.dpsindore.org` / `demo123`
>   - **Council:** `5002@student.dpsindore.org` / `demo123`
>   - **Principal:** `principal@dpsindore.org` / `demo123`
> - Ask the panel to open the same link on their phones before you begin

---

## ⏱ TIMELINE OVERVIEW
| Time | Segment |
|------|---------|
| 0:00 – 1:30 | The Problem (your personal story) |
| 1:30 – 3:00 | What We Tried Before (and why it failed) |
| 3:00 – 4:30 | The Moment of Inspiration |
| 4:30 – 6:00 | Introducing Vox DPSI |
| 6:00 – 12:30 | Live Interactive Demo |
| 12:30 – 14:00 | Why This Works — The Bigger Picture |
| 14:00 – 15:00 | The Ask |

---

## PART 1 — THE PROBLEM *(0:00 to 1:30)*

> *Walk to the centre of the room. No slides yet. Just speak.*

---

**"Sir, Ma'am — I want to start with a question.**

How many of you, when you were in school, had a complaint about something — the food in the canteen, a classroom that was too hot, a teacher who wasn't covering the syllabus — and just… said nothing?

Not because you didn't care. But because you didn't know *who* to tell. Or you were afraid that if you said something, it would come back to you.

I've been in this school for seven years. And I can tell you — that silence is everywhere.

Students complain to each other in corridors. They post anonymously on social media. They carry frustration for an entire academic year because there is no *official, safe, accountable* channel between them and the people who can actually fix things.

That gap — between what a student experiences and what the administration knows — is the problem I want to solve today."

---

## PART 2 — WHAT WE TRIED BEFORE *(1:30 to 3:00)*

> *Move to the touchscreen. Still no live app — this is story time.*

---

**"When I first brought this up in the Coordinator Round earlier, I proposed two solutions.**

**The first was a ballot box system** — a physical box in each classroom where students could drop anonymous written complaints. Simple. Low-tech.

But here's the problem: Who empties the box? When? If a student drops a complaint on Monday, does it reach anyone by Friday? And if the complaint is serious — say, a student is being bullied — a piece of paper in a box is not going to protect them.

More importantly: there's no *verification*. Anyone can write anything. There's no record of who raised it, whether it was investigated, or what happened next.

**The second was a Class Representative system** — each class elects a rep who channels complaints upward. More structured.

But again — what happens to the complaint after the CR hears it? Does it get escalated? Does it get solved? Does the student who raised it ever find out? There's no trail. No accountability. The complaint disappears into a conversation and is never heard from again.

Both systems had the same fatal flaw: **no transparency. No verification. No audit trail.**"

---

## PART 3 — THE MOMENT OF INSPIRATION *(3:00 to 4:30)*

> *Pause. This is your most personal moment. Slow down.*

---

**"Three months ago, I was at home and the water supply in our colony hadn't come for two days.

My father told me to open Indore 311 — the municipal grievance app for Indore city. I opened it, filed a complaint in two minutes: selected the category, wrote a description, submitted. Got a complaint number. Within 48 hours, I received a status update. The complaint was being actioned.

I sat there thinking — *why does the city of Indore have a better grievance system for its 35 lakh residents than Delhi Public School Indore has for its 2,000 students?*

If the government can build accountability into a public system — if a civic complaint can be tracked from submission to resolution — why can't we do the same inside our school?

That's when I stopped thinking about boxes and representatives. And I started thinking about software."

---

## PART 4 — INTRODUCING VOX DPSI *(4:30 to 6:00)*

> *Now walk to the touchscreen and open the app. Keep it on the Login page for now.*

---

**"Ladies and gentlemen — this is Vox DPSI."**

> *Gesture to the screen.*

**"Vox — from the Latin word for 'voice'. DPSI — Delhi Public School Indore.**

*The voice of DPS Indore.*

This is a full-stack web application I built specifically for our school. It runs on any browser — phone, tablet, laptop. No app download required. Just open the link.

It has six roles: Student, Council Member, Class Teacher, Coordinator, Principal, and Supervisor — which is the House President or School President.

Every complaint raised by a student travels through a structured escalation ladder. Every action is timestamped. Every decision is logged. And if a student requests anonymity, the system honours that — their identity is only revealed if they consent, and only when absolutely necessary.

I'm going to show you exactly how it works. And I'd like you to follow along on your phones."

---

## PART 5 — LIVE INTERACTIVE DEMO *(6:00 to 12:30)*

> *This is the heart of your pitch. Go slowly. Let them keep up.*

---

### DEMO STEP 1 — Student Logs In and Raises a Complaint *(6:00 – 7:30)*

> *Ask the principal or VP to open `https://vox-dpsi.vercel.app` on their phone.*
> *On the big screen, log in as student.*

**"Let me play the role of a student. I'm Rahul Sharma, Scholar No. 5001, Class XII B.**

I log in."

> *Type: `5001@student.dpsindore.org` | Password: `demo123` → Login*

**"This is my dashboard. I can see my past complaints and their current status. Right now it's mostly empty — in a real deployment, this would show everything from the past year.**

I want to raise a new complaint. Let me click — *Raise a Complaint.*"

> *Click "+ Raise a Complaint"*

**"I select the domain. Let's say Infrastructure — there's a broken fan in our classroom that's been broken for three weeks.**

I write my description. I can attach a photo if I want — maybe I've photographed the broken fan.

Now — notice this toggle at the bottom. *Request Anonymity.* If I switch this on, the system will protect my identity when the complaint is escalated. My council member will always know it's me — but above that level, I become anonymous unless I choose otherwise.

I submit."

> *Submit the complaint. Show the VOX-XXXX confirmation screen.*

**"VOX-0005. That's my complaint number. I can share this with anyone and they can track it. Just like an Indore 311 complaint number."**

---

### DEMO STEP 2 — Council Member Receives It *(7:30 – 9:00)*

> *On the big screen, log out and log in as council member.*
> *Ask someone from the panel to try this on their phone.*

**"Now I switch roles. I'm a Council Member — Priya Verma. This is who the Student Council elects to handle complaints.**

Login: `5002@student.dpsindore.org` | Password: `demo123`"

> *Log in as council member*

**"Notice — I can immediately see Rahul's complaint assigned to me. And I can see his name — even though he requested anonymity. Because I'm his direct point of contact. There's trust at this level.

I can see: what he complained about, when, and what category. I have four actions available to me:**

**— Mark as Verified:** I've met Rahul in person and confirmed this is real.
**— Mark as In Progress:** I'm actively working on it.
**— Resolve:** I fixed it myself — maybe I spoke to the maintenance team.
**— Escalate:** This is beyond my authority. I need to take it higher."

> *Click "Escalate to Class Teacher"*

**"When I escalate — watch this."**

> *The Escalation Modal opens*

**"The system asks me: 'This student requested anonymity. Do you want to reveal their identity to the next handler?' I choose NO. Rahul's name will not be shared. Only his complaint number goes forward.**

This is the anonymity guarantee. It's not just a promise — it's enforced by the system itself."**

---

### DEMO STEP 3 — Principal's Dashboard *(9:00 – 11:00)*

> *Now show the Principal dashboard. Invite the actual principal to try it on their phone.*

**"Sir — I'd like to invite you to try this. Open the link on your phone. Email: `principal@dpsindore.org` Password: `demo123`"**

> *Let them log in. Walk them through it.*

**"This is your dashboard, Sir.

You can see the total number of complaints raised this year. How many are resolved. How many are pending. How many have escalated all the way to you.

Every single complaint — from every class, every house, every domain — is visible here. You can filter by domain, by status, by section.

Click on any complaint — you'll see the full timeline. Every action, every person, every timestamp. Who raised it. Who verified it. Who escalated it and why. When it was resolved.

This is the audit trail that no ballot box and no class representative system can give you.

You also have a green Resolve button. With a resolution note. When you mark something resolved, the student receives a status update on their dashboard instantly."**

> *Pause. Let this land.*

**"Sir, the most powerful part of this dashboard is not what it shows you today. It's what it will show you after one full academic year of use. You'll know which domains generate the most complaints. Which sections have recurring issues. Where the school needs to improve.

This is institutional intelligence. Built automatically. Every single day."**

---

### DEMO STEP 4 — The Timeline *(11:00 – 12:00)*

> *Click on any complaint and scroll to the timeline at the bottom.*

**"Every complaint has a timeline. Let me show you one of our sample complaints.**

Look at this — raised on this date. Verified in person by council member on this date. Escalated on this date with the reason logged. Actioned by coordinator. Resolved on this date with a resolution note.

This is the complete history of one student's problem. From the moment they felt safe enough to speak up — to the moment it was fixed.

No complaint falls through the cracks. No complaint goes unacknowledged. Every student knows someone is listening."**

---

### DEMO STEP 5 — Supervisor View *(12:00 – 12:30)*

**"Finally — there's a Supervisor role. As School President or House President, I would log in here.**

I can see every complaint across the entire system. I can add notes. I can monitor whether council members are responding quickly. I can flag patterns.

This makes the Student Council genuinely accountable — not just to students, but to the administration. Everyone can see what's happening. In real time."**

---

## PART 6 — WHY THIS WORKS *(12:30 to 14:00)*

> *Step away from the screen. Face the panel directly.*

---

**"I want to address what you might be thinking.**

*'What stops students from abusing this? Filing fake complaints?'*

Every complaint is verified in person by a council member before it moves anywhere. A complaint that can't be verified in person gets closed. The system enforces that gate.

*'What about privacy? Could a teacher find out who filed a complaint?'*

Only if the council member explicitly reveals the identity — and the system logs that decision with a reason, permanently. The anonymity system is auditable. If a council member misuses it, the principal can see exactly what happened.

*'Who maintains this?'*

The system runs on Supabase — a globally hosted database — and Vercel, one of the world's leading hosting platforms. It costs less than ₹500 per month to run at full scale for our school. Zero server infrastructure required from DPS Indore.

*'What if a student doesn't have a phone?'*

Any school computer, any browser. The interface is fully responsive. It works on a laptop in the library just as well as on a phone.

This is not a pilot project. This is not a concept. It is live. It is deployed. You are using it right now."**

---

## PART 7 — THE ASK *(14:00 to 15:00)*

> *Stand in the centre of the room. This is your close.*

---

**"Seven years ago, I joined this school as a student. Today, I'm asking to serve it as its School President.

My vision for the Student Council is not just events and spirit weeks. It's accountability. It's giving every student — from Class VI to Class XII — a safe, structured, dignified way to be heard.

Vox DPSI is my first proposal as a presidential candidate. If I am elected, I want to formally pilot this system with Class XII sections in Term 1, evaluate the results, and present a full implementation proposal to the administration by December.

I don't want to hand you a document. I don't want to make a promise. I've already built the thing.

The question is whether DPS Indore is ready to give its students a voice.

I believe it is. I believe *you* believe it is.

Thank you."**

> *Do not touch the screen. Do not click anything. Just stand there.*
> *Let the silence sit for three full seconds before you invite questions.*

---

## ANTICIPATED QUESTIONS & ANSWERS

**Q: How long did it take you to build this?**
> "About three weeks of focused work, entirely during my own time — evenings and weekends. I used React for the frontend, Node.js for the backend, and Supabase for the database — the same technology stack used by companies like Netflix and Airbnb."

**Q: What happens to the data if you graduate?**
> "The system is documented end-to-end on GitHub. Any developer — student or external — can pick it up and continue. I'll personally hand it over to the next council and provide onboarding documentation. The data lives on Supabase, not on my machine."

**Q: Have other schools done something like this?**
> "Some schools abroad have basic ticketing forms. No school in India — that I'm aware of — has built a purpose-designed, role-based grievance system with anonymity protection and a full audit trail. Vox DPSI is, to my knowledge, the first of its kind in Indian school administration."

**Q: What if a complaint is about a teacher?**
> "That complaint would be handled by the Coordinator and Principal directly. The council member escalates without revealing the student's identity. The principal sees the complaint and takes action. The teacher never sees who filed it."

**Q: Could this replace the existing suggestion box?**
> "It doesn't replace it — it augments it. The suggestion box is fine for anonymous ideas. Vox DPSI is for actionable complaints that need follow-through and resolution. They serve different purposes."

---

## FINAL NOTES FOR THE DAY

- **If Vercel is loading slowly:** Refresh once — the server spins up in about 5 seconds on first load after inactivity.
- **Demo account passwords:** All are `demo123`
- **If someone can't log in:** Help them manually — type the email for them on their phone.
- **Speak slower than you think you need to.** The app does the selling — your job is just to not get in its way.
- **You've already won the technical argument.** You built a real, working system. That's unprecedented. Own it.

---

*Good luck. You've earned this.*
