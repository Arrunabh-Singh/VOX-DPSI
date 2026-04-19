# Vox DPSI — Student Grievance Management System

> **Live URL:** https://vox-dpsi.vercel.app  
> **Presentation:** https://vox-dpsi.vercel.app/presentation/  
> **Version:** v2.0 — DPS Indore green design, frosted glass UI, 11-slide HTML presentation

A full-stack institutional grievance platform for Delhi Public School Indore. Students raise complaints by category; council members handle them; complex issues escalate through teachers → coordinator → principal. Every action is permanently logged. An anonymity system lets students protect their identity during escalation.

Built entirely by Claude (Anthropic) in a single Cowork session, commissioned by Arrunabh Singh for his Student Council Presidential interview at DPS Indore.

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)

### 1. Clone & Install

```bash
# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `schema.sql` (from the root of this repo)
3. Then run `seed.sql` to populate demo accounts and sample complaints
4. Go to **Storage** → create a public bucket named `attachments`
5. Copy your **Project URL**, **anon public key**, and **service_role key** from Project Settings → API

### 3. Environment Variables

**Server** — create `server/.env`:
```
PORT=5000
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
JWT_SECRET=any_random_string_min_32_chars
CLIENT_URL=http://localhost:5173
```

**Client** — create `client/.env`:
```
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key
```

### 4. Run

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

App runs at **http://localhost:5173**

---

## Demo Accounts (all password: `demo123`)

| Role           | Email                            | Name                   |
|----------------|----------------------------------|------------------------|
| Student        | 5001@student.dpsindore.org       | Rahul Sharma (XII B)   |
| Council Member | 5002@student.dpsindore.org       | Priya Verma            |
| Class Teacher  | sharma@staff.dpsindore.org       | Mrs. Sharma            |
| Coordinator    | kapil@staff.dpsindore.org        | Mr. Kapil Sir          |
| Principal      | principal@dpsindore.org          | Mr. Parminder Chopra   |
| Supervisor     | 5411@student.dpsindore.org       | Arrunabh Singh         |

The login screen has **quick-fill buttons** for all 6 demo accounts — no typing required for demo.

---

## 3-Minute Demo Flow

1. **Login as Student** → Raise a complaint (Infrastructure, toggle anonymity ON)
2. **Login as Council Member** → See complaint with student name + "Anon Requested" badge
3. Mark as **Verified** → Mark as **In Progress** → Click **Escalate** → choose to hide identity → confirm
4. **Login as Coordinator** → see complaint showing "Anonymous Student"
5. **Login as Principal** → full dashboard with stats + Export CSV
6. **Login as Supervisor** → full system view with house/section breakdown

---

## Deployment

### Frontend → Vercel
```bash
# Push client/ to GitHub, then connect to Vercel
# Set env vars: VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

### Backend → Railway
```bash
# Push server/ to GitHub (or use monorepo root)
# Set env vars: PORT, SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET, CLIENT_URL
```

### CORS
Update `CLIENT_URL` in Railway to your Vercel URL (e.g. `https://vox-dpsi.vercel.app`)

---

## Tech Stack

| Layer    | Technology                           |
|----------|--------------------------------------|
| Frontend | React 18 + Vite + Tailwind CSS       |
| Backend  | Node.js + Express                    |
| Database | Supabase (PostgreSQL)                |
| Auth     | JWT (role-based, 7-day expiry)       |
| Storage  | Supabase Storage (attachments)       |
| Toasts   | react-hot-toast                      |
| Router   | React Router v6                      |

---

## Roles & Access

| Role           | Can See                        | Can Do                                    |
|----------------|--------------------------------|-------------------------------------------|
| student        | Own complaints only            | Raise, view, request anonymity            |
| council_member | Assigned complaints            | Verify, progress, resolve, escalate       |
| class_teacher  | Escalated to them              | Resolve, escalate to coordinator, note    |
| coordinator    | All coordinator-level          | Resolve, escalate to principal, note      |
| principal      | Everything                     | Resolve, close, export CSV                |
| supervisor     | Everything (read + note)       | Add notes only                            |

---

## Design

v2 uses DPS Indore's actual brand colors extracted from the school logo:
- **Primary green:** `#1B4D2B` (shield color)
- **Gold accent:** `#C9920A` (torch flame)
- **Font:** Outfit (Google Fonts)
- **Glass UI:** `backdrop-filter: blur()` throughout for frosted glass cards

---

## Presentation

A standalone 11-slide HTML presentation lives at `client/public/presentation/index.html`.
Open it in any browser — **no server needed**.

**Keyboard controls:** `→` / `Space` = next · `←` = back · `R` = reset · `1–9` = jump to slide

Slides cover: The Problem → Inspiration → What is Vox DPSI? → 6 Roles → Anonymity System → Complaint Flow → App Screens → Tech Stack → Why It Matters → Closing

---

## Architecture Notes

- **ES Modules** (`"type": "module"`) throughout the backend — use `import`/`export`, not `require`
- **Anonymity logic:** `is_anonymous_requested` (set by student) vs `identity_revealed` (set by council on escalation). See `server/routes/complaints.js` PATCH `/escalate` endpoint
- **JWT payload:** `{ id, name, role, scholar_no, section, house }` — role determines dashboard routing in `client/src/App.jsx`
- **Complaint number format:** `VOX-0001` (zero-padded 4 digits) — logic in `server/utils/complaintNo.js`
- **Timestamps:** All displayed in IST (UTC+5:30) via `formatIST()` in `client/src/utils/formatDate.js`
- **Supabase anon key** is safe to commit to frontend — it's public by design. The service role key in `server/.env` must never be committed.

---

*Built by Claude (Anthropic) for Arrunabh Singh · DPS Indore Student Council Presidential Interview · April 2026*
