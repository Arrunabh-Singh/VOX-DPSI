# 🚀 Vox DPSI — Execution Plan: Secure & Complete by June 1, 2026
### Prepared by OWL (Hermes) | May 14, 2026

---

## 📊 Current State Assessment

| Area | Status | Notes |
|------|--------|-------|
| Frontend | ✅ 90% complete | React + Tailwind, all pages built, deployed on Vercel |
| Backend | ✅ 85% complete | Express + 15 routes, deployed on Railway |
| Database | ⚠️ 70% | Schema built, 6 migrations NOT applied |
| Security | ⚠️ 60% | Basic helmet/rate-limit, needs hardening |
| DevOps | ⚠️ 50% | No staging, no uptime monitoring, Railway dying |
| DPDP Compliance | ✅ 80% | VPC flow built, audit done, formal review pending |
| Pitch Materials | ✅ 95% | Deck, one-pager, video script all ready |

**Timeline:** 18 days (May 14 → June 1)

---

## 🏗️ Phase 1: Foundation & Security (Days 1-5, May 14-18)

### 1.1 — Run Pending Database Migrations (Day 1, 2 hours)
**Priority:** CRITICAL — Multiple features will crash without these

```sql
-- Run in Supabase SQL Editor in this order:
-- https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql

1. migration_delegation.sql      → delegation_rules table
2. migration_consensus.sql       → complaint_votes table + consensus columns
3. migration_term_limits.sql     → term_start/end/role on users
4. migration_guardian_role.sql   → guardian/parent role support
5. migration_erasure_feedback.sql → erasure request workflow
6. migration_system_config.sql   → system_config table
```

**Verification:** After each migration, run `SELECT * FROM <table> LIMIT 1` to confirm.

### 1.2 — Fix Config Route Ordering Bug (Day 1, 1 hour)
**Priority:** CRITICAL — Assignment rules endpoint is unreachable

In `server/routes/config.js`: Move `/assignment-rules` routes BEFORE `/:key` catch-all.

### 1.3 — Railway Alternative: Migrate to Render (Days 2-3)
**Why:** Railway free tier is being discontinued. Render offers free tier for web services.

**Steps:**
1. Create Render account at render.com
2. Create New Web Service → Connect GitHub repo
3. Settings:
   - Root: `/home/arrunabh/Vox-dpsi/vox-dpsi`
   - Build: `cd server && npm install`
   - Start: `cd server && node index.js`
   - Plan: Free
4. Add env vars (same as Railway)
5. Deploy and verify health endpoint
6. Update `VITE_API_URL` in Vercel to new Render URL
7. Update CORS `CLIENT_URL` in Render to Vercel URL
8. Test full flow end-to-end

**Alternative if Render free tier insufficient:** Fly.io (free tier with 3 shared-cpu VMs)

### 1.4 — Security Hardening (Days 3-5)
**Priority:** HIGH — Must be done before June 1 launch

#### Backend Security (`server/index.js` + middleware)
```javascript
// 1. Helmet — already installed, verify all headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind needs this
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.SUPABASE_URL],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' }
}))

// 2. CORS — restrict to Vercel domain ONLY
app.use(cors({
  origin: process.env.CLIENT_URL, // https://vox-dpsi.vercel.app
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// 3. Rate limiting
const generalLimiter = rateLimit({ windowMs: 15*60*1000, max: 100 })
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 5 })
app.use('/api/', generalLimiter)
app.use('/api/auth/', authLimiter)

// 4. Input sanitization middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
```

#### Supabase RLS Verification
```sql
-- Verify RLS is ON for all tables:
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN (
  'users', 'complaints', 'complaint_timeline', 'escalations',
  'notifications', 'complaint_access_log', 'audit_log',
  'complaint_votes', 'delegation_rules', 'workflow_templates',
  'resolution_templates', 'system_config'
);

-- If any show rowsecurity = false, enable:
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
```

#### File Upload Security
```javascript
// In server/routes/upload.js:
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

// Validate file type by magic bytes, not just extension
// Generate UUID filename (never use user-provided names)
// Store in private bucket, return signed URL
```

#### Client-Side Security
- Add error boundary component wrapping App
- Sanitize all user-rendered content (DOMPurify for rich text)
- Verify HTTPS enforcement
- Add CSP meta tag in index.html

### 1.5 — Set Up MCP Servers (Day 5)
```bash
# Install MCP servers for Claude Code to use:

# Supabase MCP — lets Claude query DB directly
claude mcp add -s project supabase -- npx @supabase/mcp-server-supabase --project-ref gznhziptmydkalsrazpj

# GitHub MCP — lets Claude push, check PRs, see CI status
claude mcp add -s user github -- npx @modelcontextprotocol/server-github

# Vercel MCP — lets Claude check deployments
claude mcp add -s user vercel -- npx @vercel/mcp-server-vercel

# Verify:
claude mcp list
```

---

## 🔧 Phase 2: Feature Completion (Days 6-12, May 19-25)

### 2.1 — Guardian/Parent Dashboard (Days 6-7)
**What:** Read-only view for parents to see their child's complaints
**Files:** `client/src/pages/GuardianDashboard.jsx` (exists, verify), `server/routes/guardian.js` (exists, verify)
**Tasks:**
- Verify VPC flow works end-to-end
- Parent sees only their linked child's complaints
- Respects anonymity flag (shows "A complaint was filed" not details if anonymous)
- Test with demo data

### 2.2 — Daily Digest Email (Days 7-8)
**What:** Morning summary email for handlers with pending complaints
**Files:** `server/jobs/autoEscalate.js` (startDailyDigestCron exists, verify)
**Tasks:**
- Verify cron job runs at 8 AM IST
- Email includes: new complaints count, overdue count, SLA breaches
- Uses Brevo API (already configured)
- Test with demo accounts

### 2.3 — Smart Assignment (Days 8-10)
**What:** Auto-assign complaints based on workload + skills
**Files:** `server/routes/config.js` (assignment rules), `server/routes/complaints.js`
**Tasks:**
- Fix assignment-rules endpoint (blocked by config.js bug — fixed in Phase 1)
- Implement round-robin assignment
- Load balancing: don't assign to handler with >10 active complaints
- Domain matching: infrastructure complaints → council members with infra skills

### 2.4 — Knowledge Base / FAQ (Days 10-11)
**What:** Searchable help for students
**Files:** `client/src/pages/KnowledgeBase.jsx` (exists, verify)
**Tasks:**
- Add search functionality
- Populate with common questions (how to file, anonymity, escalation, timeline)
- Hindi translations for all FAQ items
- Link from Navbar

### 2.5 — Uptime Monitoring (Day 12)
**What:** Know immediately when the app goes down
**Steps:**
1. Create UptimeRobot account (free)
2. Add 3 monitors:
   - `https://<render-url>/health` — Backend
   - `https://vox-dpsi.vercel.app` — Frontend
   - `https://vox-dpsi.vercel.app/api/complaints` — API
3. Alert to Telegram (use Telegram bot webhook)
4. Test by temporarily breaking the backend

---

## 🧪 Phase 3: Testing & Polish (Days 13-16, May 26-29)

### 3.1 — Full QA Pass (Days 13-14)
**Test every role, every flow:**

| Test | Expected | Status |
|------|----------|--------|
| Student raises complaint (anonymous) | VOX-XXXX number shown | ☐ |
| Student raises complaint (not anonymous) | VOX-XXXX number shown | ☐ |
| Council sees anonymous complaint | Real name visible + "(Anon Req)" badge | ☐ |
| Council escalates (hide identity) | Teacher sees "Anonymous Student" | ☐ |
| Council escalates (reveal identity) | Teacher sees real name | ☐ |
| Teacher resolves complaint | Status → resolved, timeline logged | ☐ |
| Principal exports CSV | Downloads with all data | ☐ |
| Supervisor adds note | Note appears in timeline | ☐ |
| Student reopens resolved complaint | Status → reopened, reopen_count +1 | ☐ |
| Auto-escalation after SLA breach | Status escalates automatically | ☐ |
| VPC flow (new student) | Cannot use system without parent consent | ☐ |
| Guardian dashboard | Sees child's complaints only | ☐ |
| File upload (JPG/PNG/PDF) | Success, signed URL returned | ☐ |
| File upload (EXE/TXT) | Rejected with error | ☐ |
| Rate limiting | 429 after 5 auth attempts | ☐ |
| Session timeout | Auto-logout after inactivity | ☐ |
| Hindi toggle | All student UI in Hindi | ☐ |
| PWA install | "Add to Home Screen" works | ☐ |
| Offline mode | Complaint saved locally, syncs on reconnect | ☐ |

### 3.2 — Performance Optimization (Day 15)
- Lighthouse CI score > 80
- First Contentful Paint < 2s on 3G
- Code splitting for dashboard routes
- Image optimization for attachments
- Database indexes on filtered columns

### 3.3 — Accessibility Audit (Day 15)
- All images have alt text
- Color contrast ratio > 4.5:1
- Keyboard navigation works
- Screen reader compatible (ARIA labels)
- Touch targets > 44px on mobile

### 3.4 — Cross-Browser Testing (Day 16)
- Chrome (primary)
- Firefox
- Safari (iOS)
- Samsung Internet (Android tablets — primary demo device)
- Edge

---

## 🚀 Phase 4: Launch Prep (Days 17-18, May 30-31)

### 4.1 — Staging Environment (Day 17)
1. Create separate Supabase project for staging
2. Deploy backend to Render staging service
3. Deploy frontend to Vercel preview
4. Run full QA on staging
5. Keep production untouched

### 4.2 — Final Security Audit (Day 17)
```bash
# Run OWASP ZAP or similar
# Check for:
# - SQL injection
# - XSS
# - CSRF
# - Broken authentication
# - Sensitive data exposure
# - Security misconfiguration
```

### 4.3 — Backup & Rollback Plan (Day 18)
1. Export full Supabase database: `pg_dump` via Supabase dashboard
2. Tag current GitHub release: `git tag v2.0.0-release`
3. Document rollback procedure
4. Test rollback on staging

### 4.4 — Launch Checklist (Day 18, May 31)
- [ ] All migrations applied
- [ ] Security hardening complete
- [ ] All QA tests passing
- [ ] Uptime monitoring active
- [ ] Staging tested
- [ ] Backups verified
- [ ] Render backend live (Railway decommissioned)
- [ ] Vercel frontend on new API URL
- [ ] Demo accounts working
- [ ] Pitch materials printed
- [ ] DPDP compliance doc signed off

---

## 📋 Token Optimization Strategy for Claude Code

### CLAUDE.md Optimization
- **Before:** 884 lines, ~35KB → **After:** ~400 lines, ~12KB
- **Savings:** ~65% reduction in system prompt tokens
- Removed: Redundant examples, verbose explanations, duplicate info
- Kept: All critical rules, schema, commands, security checklist

### Claude Code Usage Patterns

**For single tasks (print mode — cheapest):**
```bash
claude -p "Fix the rate limiting in server/index.js — add 100 req/15min general, 5 req/15min auth" \
  --allowedTools "Read,Edit" --max-turns 5
```

**For complex multi-file tasks (interactive):**
```bash
claude -p "Implement the guardian dashboard: verify VPC flow, ensure anonymity respect, add read-only complaint list. Check server/routes/guardian.js and client/src/pages/GuardianDashboard.jsx" \
  --allowedTools "Read,Edit,Write,Bash" --max-turns 15
```

**For security audit (read-only, cheap):**
```bash
claude -p "Review all server/routes/*.js files for security issues: SQL injection, XSS, broken auth, rate limiting gaps. List findings by severity." \
  --allowedTools "Read" --max-turns 10
```

**For parallel work (3x speed):**
```bash
# Terminal 1: Security hardening
claude -p "Add helmet, CORS, rate limiting to server/index.js" --allowedTools "Read,Edit" --max-turns 8 &

# Terminal 2: Run migrations
claude -p "Guide me through running all 6 pending migrations in Supabase" --allowedTools "Bash" --max-turns 5 &

# Terminal 3: QA testing
claude -p "Write a comprehensive test script for the complaint lifecycle" --allowedTools "Read,Write" --max-turns 10 &
```

### Custom Slash Commands (Create in `.claude/commands/`)
```markdown
# .claude/commands/security-scan.md
Scan the entire codebase for security vulnerabilities:
1. Check all server routes for input validation
2. Verify RLS policies in Supabase
3. Check for secrets in code
4. Verify CORS, helmet, rate limiting
5. Check file upload security
Report findings by severity (CRITICAL/HIGH/MEDIUM/LOW).

# .claude/commands/qa-run.md
Run the full QA checklist:
1. Test all 6 demo accounts
2. Test complaint lifecycle (raise → verify → escalate → resolve)
3. Test anonymity system
4. Test file upload
5. Test rate limiting
Report pass/fail for each test.

# .claude/commands/deploy-check.md
Verify deployment readiness:
1. Check all env vars are set
2. Verify health endpoint
3. Check CORS config
4. Verify RLS policies
5. Check for null bytes in server files
Report any blockers.
```

---

## 📊 Summary: What Gets Done By When

| Day | Date | Focus | Deliverable |
|-----|------|-------|-------------|
| 1 | May 14 | Migrations + Config bug | DB fully migrated, routes fixed |
| 2-3 | May 15-16 | Render migration | Backend on Render, Vercel updated |
| 3-5 | May 16-18 | Security hardening | All security checklist items ✅ |
| 5 | May 18 | MCP setup | Supabase, GitHub, Vercel MCPs configured |
| 6-7 | May 19-20 | Guardian dashboard | Parent read-only view working |
| 7-8 | May 20-21 | Daily digest | Morning emails for handlers |
| 8-10 | May 21-23 | Smart assignment | Auto-assignment with load balancing |
| 10-11 | May 23-24 | Knowledge base | Searchable FAQ with Hindi |
| 12 | May 25 | Uptime monitoring | UptimeRobot + Telegram alerts |
| 13-14 | May 26-27 | Full QA | All tests passing |
| 15 | May 28 | Performance + a11y | Lighthouse > 80, accessible |
| 16 | May 29 | Cross-browser | Works on all target browsers |
| 17 | May 30 | Staging + security audit | Staging live, security verified |
| 18 | May 31 | Launch prep | Backoffs, rollback, final check |
| **19** | **June 1** | **🚀 LAUNCH** | **Secure, complete, demo-ready** |

---

## 🎯 Success Criteria for June 1

1. ✅ All 6 demo accounts work flawlessly
2. ✅ Full complaint lifecycle works (raise → escalate → resolve)
3. ✅ Anonymity system works (council sees name, others see "Anonymous")
4. ✅ Backend on Render (Railway decommissioned)
5. ✅ Security hardening complete (all checklist items)
6. ✅ Uptime monitoring active
7. ✅ Lighthouse score > 80
8. ✅ Cross-browser compatible
9. ✅ DPDP compliance verified
10. ✅ Pitch materials ready (deck printed, video ready)

---

*Plan prepared by OWL. Execute via Claude Code with CLAUDE.md as context. Estimated Claude Code usage: ~50-80 print-mode calls, ~5-10 interactive sessions. Estimated cost: $15-30 in API tokens.*
