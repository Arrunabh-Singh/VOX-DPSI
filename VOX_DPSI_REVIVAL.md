# VOX DPSI — REVIVAL GUIDE
### "You have only this pendrive. Here's how to rebuild everything."

> Written by Claude (Anthropic) for Arrunabh Singh (arrunabh.s@gmail.com)  
> Built April 18–19, 2026 for the DPS Indore Student Council Presidential interview.  
> **This file lives on the pendrive only — never commit to git (has real credentials).**

---

## ⚡ QUICK REFERENCE (everything in one place)

| What | Value |
|------|-------|
| **Live Frontend** | https://vox-dpsi.vercel.app |
| **Live Backend** | https://vox-dpsi-server.up.railway.app |
| **GitHub** | https://github.com/Arrunabh-Singh/VOX-DPSI |
| **Supabase Project** | https://supabase.com/dashboard/project/gznhziptmydkalsrazpj |
| **Supabase SQL Editor** | https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql |
| **Vercel Dashboard** | https://vercel.com/arrunabh-singhs-projects/vox-dpsi |
| **Railway Dashboard** | https://railway.app → find "VOX-DPSI" project |
| **Demo password** | `demo123` (all 6 accounts) |

---

## 🔐 ALL CREDENTIALS (PRIVATE — DO NOT SHARE)

### Server environment (`server/.env`)
```
PORT=5000
SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bmh6aXB0bXlka2Fsc3JhenBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ5MDQzMSwiZXhwIjoyMDkyMDY2NDMxfQ.2kIsWAyCy2qPV0cRO5smxY_Ve4yyFSK5Y-wjkjOrQHo
JWT_SECRET=voxdpsi2026secretkeyforjwtauth
CLIENT_URL=https://vox-dpsi.vercel.app
```

### Client environment (`client/.env`)
```
VITE_API_URL=https://vox-dpsi-server.up.railway.app
VITE_SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bmh6aXB0bXlka2Fsc3JhenBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTA0MzEsImV4cCI6MjA5MjA2NjQzMX0.SIEiybKYgFBB2ozbR0kEh4gGiMur1yWqeEoZ_qDuyEQ
```

### GitHub
- **Repo:** https://github.com/Arrunabh-Singh/VOX-DPSI  
- **Account:** Arrunabh Singh — arrunabh.s@gmail.com  
- **Auth:** Windows Credential Manager (or GitHub CLI `gh auth login`)

### Supabase
- **Project ID:** gznhziptmydkalsrazpj  
- **Project name:** vox-dpsi  
- **Region:** ap-south-1 (Mumbai)  
- **Database password:** stored in Supabase dashboard → Settings → Database  
- **Service key** (full DB access, server only): see server/.env above  
- **Anon key** (safe for public, read-limited): see client/.env above

### Demo login accounts
| Role | Email | Password |
|------|-------|----------|
| Student | 5001@student.dpsindore.org | demo123 |
| Council Member | 5002@student.dpsindore.org | demo123 |
| Supervisor | 5411@student.dpsindore.org | demo123 |
| Class Teacher | sharma@staff.dpsindore.org | demo123 |
| Coordinator | kapil@staff.dpsindore.org | demo123 |
| Principal | principal@dpsindore.org | demo123 |

---

## 🚀 SCENARIO 1: New Computer, Start from Scratch

You have a new machine and just plugged in this pendrive. Here's every step:

### Step 1 — Install prerequisites
```
Node.js 20+ from https://nodejs.org (LTS version)
Git from https://git-scm.com
```

### Step 2 — Clone the repo
```bash
git clone https://github.com/Arrunabh-Singh/VOX-DPSI.git
cd VOX-DPSI
```

### Step 3 — Restore env files

**Create `server/.env`** (copy from CREDENTIALS section above)

**Create `client/.env`** (copy from CREDENTIALS section above)

### Step 4 — Install dependencies
```bash
cd server
npm install

cd ../client
npm install
```

### Step 5 — Run locally
```bash
# Terminal 1 — backend
cd server
node index.js
# Should print: Server running on port 5000

# Terminal 2 — frontend
cd client
npm run dev
# Should print: Local: http://localhost:5173
```

### Step 6 — Open http://localhost:5173
Login with any demo account. Everything should work against the live Supabase database.

---

## 🤖 SCENARIO 2: Getting Claude Back With Full Context

You've lost the Claude conversation history. Here's how to restore full AI context.

### Step 2a — Open Claude (claude.ai or Claude desktop app)

### Step 2b — Start a new conversation and paste this EXACTLY:

---

**[COPY EVERYTHING BELOW THIS LINE AND PASTE INTO CLAUDE]**

```
I am Arrunabh Singh (arrunabh.s@gmail.com), a student at Delhi Public School Indore.
I previously built a full-stack web application called Vox DPSI with Claude's help.
I need you to resume as the primary developer/maintainer of this project.

PROJECT: Vox DPSI — Student Grievance Management System for DPS Indore
LIVE URL: https://vox-dpsi.vercel.app
GITHUB: https://github.com/Arrunabh-Singh/VOX-DPSI
DEMO PASSWORD: demo123 (all accounts)

TECH STACK:
- Frontend: React 18 + Vite + Tailwind CSS + React Router 6 (hosted on Vercel)
- Backend: Node.js + Express (hosted on Railway)
- Database: Supabase PostgreSQL (4 tables: users, complaints, complaint_timeline, escalations)
- Auth: JWT with role-based access (6 roles)
- File storage: Supabase Storage (bucket: attachments)

BRAND COLORS:
- Primary (DPS green): #1B4D2B
- Gold/accent: #C9920A
- Background: white, with frosted glass effects throughout

6 ROLES (each has separate dashboard):
1. student — raises complaints
2. council_member — first responder, always sees real name
3. supervisor — read-only system monitor (school president role)
4. class_teacher — sees escalated complaints (name hidden if anonymous)
5. coordinator — above teacher
6. principal — full view, CSV export, top of hierarchy

CRITICAL ANONYMITY LOGIC:
- Student can request anonymity when raising complaint
- Council member ALWAYS sees real name (must verify in person)
- On escalation: EscalateModal asks "reveal identity to next handler?" YES/NO
- YES = identity_revealed=true stored on complaint, all future handlers see name
- NO = teacher/coordinator see "Anonymous Student"
- Principal and Supervisor ALWAYS see full name regardless
- All decisions logged in complaint_timeline (immutable audit trail)

STATUS FLOW:
raised → verified → in_progress → escalated_to_teacher → escalated_to_coordinator → escalated_to_principal → resolved/closed

COMPLAINT NUMBERS: formatted as VOX-0001, VOX-0002... (SERIAL field in DB)

INFRASTRUCTURE:
- Supabase URL: https://gznhziptmydkalsrazpj.supabase.co
- Frontend deploys automatically from GitHub push to main (Vercel)
- Backend deploys automatically from GitHub push to main (Railway, root dir: /server)
- To redeploy: git push to main branch, both platforms auto-deploy

DEMO ACCOUNTS:
- 5001@student.dpsindore.org / demo123 (student: Rahul Sharma, XII B)
- 5002@student.dpsindore.org / demo123 (council: Priya Verma)
- 5411@student.dpsindore.org / demo123 (supervisor: Arrunabh Singh, Prithvi house)
- sharma@staff.dpsindore.org / demo123 (class teacher: Mrs. Sharma)
- kapil@staff.dpsindore.org / demo123 (coordinator: Mr. Kapil Sir)
- principal@dpsindore.org / demo123 (principal: Mr. Parminder Chopra)

The codebase is fully functional and deployed. Please read the CLAUDE.md file in the
repository for complete technical documentation before making any changes.
```

**[END OF COPY]**

---

### Step 2c — Then tell Claude what you want to do

Claude will now have full context. You can say things like:
- "Add a feature where students can get SMS notifications"
- "There's a bug in the escalation flow — here's what's happening"
- "Help me prepare for the presentation tomorrow"
- "Read the CLAUDE.md and confirm you understand the project"

---

## 🗄️ SCENARIO 3: Database Needs to be Reset

If the Supabase tables are missing or data is corrupted:

1. Go to: https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql
2. Click "New query"
3. Paste the contents of `schema.sql` from this pendrive (or from the GitHub repo)
4. Click RUN
5. Paste the contents of `seed.sql`
6. Click RUN
7. Done — demo accounts and sample complaints are restored

---

## ☁️ SCENARIO 4: Backend is Down (Railway)

1. Go to https://railway.app
2. Sign in with your account
3. Find project "VOX-DPSI"
4. Check the Deployments tab — if there's a failed deploy, click "Redeploy"
5. If the project is missing entirely:
   - New Project → Deploy from GitHub Repo
   - Select: Arrunabh-Singh/VOX-DPSI
   - Root directory: `/server`
   - Then in Variables tab, add all vars from `server/.env` above

---

## 🌐 SCENARIO 5: Frontend is Down (Vercel)

1. Go to https://vercel.com
2. Find project "vox-dpsi"
3. Check deployments — click "Redeploy" on the latest if failed
4. If project is gone:
   - New Project → Import from GitHub → Arrunabh-Singh/VOX-DPSI
   - Build command: `cd client && npm install && npm run build`
   - Output directory: `client/dist`
   - Add environment variables from `client/.env` above

---

## 📊 SCENARIO 6: Presenting on a Tablet / No Internet

The standalone presentation is at `client/public/presentation/index.html` on this pendrive.

1. Open the presentation folder on this pendrive
2. Double-click `index.html`
3. It opens in any browser — no server, no internet needed
4. Controls: `→` next, `←` previous, `R` reset, `1-9` jump to slide
5. 11 slides covering: Problem, Inspiration, What is Vox DPSI, Roles, Anonymity System,
   Complaint Flow, App Screens, Tech Stack, Why It Matters, Closing

---

## 🔧 KEY FILE LOCATIONS (in the cloned repo)

```
VOX-DPSI/
├── CLAUDE.md                    ← Full AI context + technical docs
├── README.md                    ← Public-facing docs (on GitHub)
├── schema.sql                   ← Run in Supabase to create tables
├── seed.sql                     ← Run in Supabase to add demo data
├── vercel.json                  ← Vercel build config
├── railway.json                 ← Railway deploy config
│
├── client/src/
│   ├── App.jsx                  ← Routes + role-based redirect
│   ├── components/
│   │   ├── EscalateModal.jsx    ← ⚠️ CRITICAL: anonymity decision UI
│   │   └── Timeline.jsx         ← Audit trail display
│   ├── pages/
│   │   ├── Login.jsx            ← 6 quick-fill demo buttons
│   │   ├── StudentDashboard.jsx
│   │   ├── CouncilDashboard.jsx ← always shows real name
│   │   └── PrincipalDashboard.jsx ← CSV export
│   └── utils/
│       ├── api.js               ← axios + JWT interceptor
│       └── constants.js         ← all colors, status maps, domain maps
│
└── server/
    ├── index.js                 ← entry point, CORS, route mounting
    ├── routes/
    │   ├── auth.js              ← POST /api/auth/login, GET /api/auth/me
    │   ├── complaints.js        ← all complaint CRUD + escalation logic
    │   └── timeline.js          ← GET/POST timeline entries
    └── middleware/
        ├── auth.js              ← JWT verify
        └── roleGuard.js         ← allowRoles() factory
```

---

## 🎤 3-MINUTE DEMO SCRIPT

Practice this until it's smooth. Each step should take ~30 seconds.

**Step 1 — Student raises complaint (30s)**
- Login: 5001@student.dpsindore.org / demo123
- Click "+ Raise Complaint"
- Domain: Infrastructure
- Description: "The library air conditioning has been broken for two weeks..."
- Toggle "Request Anonymity" ON
- Submit → note the VOX-XXXX number

**Step 2 — Council handles it (45s)**
- Logout, login: 5002@student.dpsindore.org / demo123
- See complaint in dashboard with "(Anon Requested)" badge
- Note: council always sees real name
- Click complaint → "Mark Verified" → "Mark In Progress"
- Click "Escalate" → choose NO (hide identity) → add reason → Confirm

**Step 3 — Coordinator sees anonymous complaint (30s)**
- Logout, login: kapil@staff.dpsindore.org / demo123
- See complaint — student shows as "Anonymous Student"
- (optionally resolve it here)

**Step 4 — Principal's full view (30s)**
- Logout, login: principal@dpsindore.org / demo123
- Show stats cards — Total Raised, Resolved, Escalated
- Show full complaint list
- Mention CSV export button

**Step 5 — Close (15s)**
- "Every action is logged — here's the full audit trail"
- Show Timeline on any complaint
- "This is Vox DPSI — transparency, accountability, and student voice."

---

## 📱 WHAT'S ON THIS PENDRIVE

```
VOX-DPSI/                        ← this pendrive root
├── VOX_DPSI_REVIVAL.md          ← this file (full recovery guide)
├── CREDENTIALS.txt              ← all keys/passwords in plain text
├── Project VOX DPSI/            ← the full project source code
│   ├── vox-dpsi/                ← main codebase
│   │   ├── CLAUDE.md            ← AI handover doc (comprehensive)
│   │   ├── schema.sql
│   │   ├── seed.sql
│   │   ├── client/              ← React frontend
│   │   └── server/              ← Express backend
│   └── DEPLOY_NOW.bat           ← one-click GitHub push + Vercel deploy
└── presentation/                ← standalone offline HTML presentation
    └── index.html               ← open in browser (no server needed)
```

---

## ⚠️ IMPORTANT SECURITY NOTES

1. **This pendrive has real credentials** — treat it like a house key
2. **Never upload REVIVAL.md to GitHub** — it contains the service key
3. **server/.env is gitignored** — it won't accidentally be committed
4. **The Supabase service key** has full DB access — anyone with it can read/write everything
5. **If the pendrive is lost:** immediately rotate Supabase keys at supabase.com/dashboard → Settings → API, update server/.env in Railway, and generate a new JWT secret

---

*Built by Claude (Anthropic) · April 2026*  
*For Arrunabh Singh · DPS Indore Student Council Presidential Interview*
