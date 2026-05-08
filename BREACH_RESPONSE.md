# Vox DPSI — Data Breach Notification Plan & Incident Response Playbook

**Document:** BREACH_RESPONSE.md  
**System:** Vox DPSI — Student Grievance Management System, Delhi Public School Indore  
**Owner:** School Principal / Data Fiduciary (as defined under DPDP Act 2023)  
**Maintained by:** Student Council President (Technical Lead)  
**Last updated:** May 2026  

---

## 1. Purpose and Legal Basis

This playbook defines the procedures Vox DPSI follows in the event of a personal data breach. It fulfils obligations under:

- **Digital Personal Data Protection (DPDP) Act 2023, Section 8(6)** — Data Fiduciaries must notify the Data Protection Board of India (DPBI) and affected Data Principals promptly upon becoming aware of a breach.
- **DPDP Act Section 9** — Special protections apply to data of children (under 18), which is the primary user base of this system.
- **IT Act 2000, Section 43A** — Reasonable security practices for sensitive personal data.

DPS Indore acts as the **Data Fiduciary**. The school principal holds ultimate accountability.

---

## 2. What Constitutes a Breach

A personal data breach is any accidental or unlawful event that leads to:

| Type | Examples |
|------|---------|
| **Confidentiality breach** | Unauthorised access to student complaints, identity exposure of anonymous complainants |
| **Integrity breach** | Unauthorised modification of complaint records, tampered escalation decisions |
| **Availability breach** | Ransomware, database deletion, prolonged system outage preventing access to active complaints |

**Incidents requiring this playbook:**
- Supabase database credentials exposed (e.g., leaked in public GitHub commit)
- JWT secret compromised (allows token forgery)
- Supabase RLS (Row Level Security) misconfiguration exposing cross-student data
- Council member account takeover
- Bulk export of student PII by unauthorised party
- File storage (Supabase Storage) bucket made publicly accessible without authorisation

---

## 3. Severity Classification

| Level | Description | Response Window |
|-------|-------------|-----------------|
| **P1 — Critical** | Active exfiltration, credentials exposed publicly, bulk PII leak | Contain within **2 hours**, notify within **24 hours** |
| **P2 — High** | Suspected unauthorised access, single-account compromise | Contain within **12 hours**, notify within **48 hours** |
| **P3 — Medium** | Configuration error with limited exposure window, no confirmed access | Contain within **24 hours**, internal review within **72 hours** |
| **P4 — Low** | Near-miss, no actual data access confirmed | Document and review within **7 days** |

---

## 4. Notification Timelines (DPDP Act Compliance)

### 4.1 Data Protection Board of India (DPBI)

Under DPDP Act Section 8(6), notification to DPBI must occur **as soon as possible** and in the prescribed form. Until DPBI notification regulations are finalised, the school will notify within **72 hours** of becoming aware of a breach (in line with GDPR precedent applied to Indian practice).

Notification must include:
- Nature of the breach (categories and approximate number of records affected)
- Identity and contact of the Data Fiduciary representative
- Likely consequences
- Measures taken or proposed to address the breach

### 4.2 Affected Students and Parents (Data Principals)

Notification to affected individuals must be:
- **In plain language** — no legal jargon
- Sent via email (on record in Supabase `users` table) and, where available, WhatsApp/SMS
- Delivered within **72 hours** of breach confirmation for P1/P2 incidents

Template notification is provided in **Appendix A** of this document.

---

## 5. Incident Response Playbook

### Step 1 — Detect & Triage (0–30 minutes)

**Who:** Anyone (student, council member, teacher, or automated alert)

- [ ] Any user who suspects a breach immediately reports to: **principal@dpsi.com** and the Student Council President
- [ ] Automated monitoring (Railway logs + UptimeRobot) alerts the President on anomalous traffic or downtime
- [ ] Technical Lead logs into Railway dashboard and pulls backend logs:
  ```
  https://railway.app → VOX-DPSI service → Logs
  ```
- [ ] Classify severity using Section 3 above
- [ ] Open an incident tracking issue on GitHub: `[INCIDENT] Brief description` labelled `security`

---

### Step 2 — Contain (30 minutes – 2 hours for P1)

Containment actions depend on breach type:

**Credentials/secrets exposed:**
```
1. Rotate Supabase service key immediately:
   Supabase Dashboard → Settings → API → Regenerate service_role key
2. Update SUPABASE_SERVICE_KEY in Railway environment variables
3. Redeploy Railway service (automatic on env var change)
4. Rotate JWT_SECRET in Railway → redeploy → all sessions invalidated
5. If GitHub token exposed: revoke at github.com → Settings → Developer Settings → Personal Access Tokens
```

**Supabase RLS misconfiguration:**
```
1. Immediately disable the affected table's public access:
   Supabase Dashboard → Table Editor → [table] → RLS → Enable RLS (if off)
2. Review and fix the specific policy
3. Run: SELECT * FROM pg_policies WHERE tablename = '[affected_table]';
   to audit all policies
```

**Compromised council/admin account:**
```
1. Locate user in Supabase: SELECT id, email FROM users WHERE email = '[email]';
2. Invalidate sessions by changing their password_hash to a random string:
   UPDATE users SET password_hash = 'COMPROMISED_LOCKED' WHERE id = '[id]';
3. Notify the user via alternative contact
```

**Supabase Storage bucket exposed:**
```
1. Supabase Dashboard → Storage → Buckets → complaint-attachments → Policies
2. Remove any public read policy
3. Verify all URLs are signed (expiry-based), not permanent public URLs
```

---

### Step 3 — Assess (2–12 hours)

- [ ] Determine exact scope: which records were accessed, time window, number of affected students
- [ ] Pull Supabase access logs: Dashboard → Logs → API Logs — filter by timestamp and IP
- [ ] Check `complaint_access_log` table for anomalous view patterns
- [ ] Determine if anonymous complainant identities were exposed
- [ ] Document findings in the GitHub incident issue

---

### Step 4 — Notify (within 72 hours of P1/P2 confirmation)

- [ ] Notify DPBI (portal: dpboard.gov.in once live, otherwise by written notice to MeitY)
- [ ] Email all affected students/parents using template in Appendix A
- [ ] Post a system notice on the Vox DPSI login screen (edit `Login.jsx` — add breach banner)
- [ ] Brief the school principal with a written incident summary (use Appendix B template)

---

### Step 5 — Recover

- [ ] Confirm all containment measures are in place
- [ ] Restore any corrupted data from Supabase point-in-time recovery (Pro plan feature)
- [ ] Reset all staff passwords via admin panel
- [ ] Conduct a full audit of all RLS policies and environment variables
- [ ] Re-test the full demo flow to confirm system is working correctly

---

### Step 6 — Post-Incident Review (within 7 days)

- [ ] Write incident post-mortem document (root cause, timeline, impact, remediation)
- [ ] Update this playbook if gaps were found
- [ ] Review whether additional safeguards are needed (MFA, network restrictions, etc.)
- [ ] Submit post-mortem to school principal for records

---

## 6. Key Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| Data Fiduciary (Principal) | principal@dpsi.com | Legal accountability, DPBI notification |
| Technical Lead (Council President) | arrunabh.s@gmail.com | Containment, recovery |
| Supabase Support | support@supabase.io | Database-level assistance |
| Railway Support | help@railway.app | Backend hosting issues |
| Vercel Support | support@vercel.com | Frontend hosting issues |

---

## 7. Preventive Measures Already in Place

The following technical safeguards are implemented in Vox DPSI:

| Safeguard | Implementation |
|-----------|----------------|
| HttpOnly JWT cookies | Prevents XSS token theft (task #51) |
| Supabase Row Level Security | All tables have RLS enabled |
| Signed storage URLs | Attachments never publicly accessible |
| Rate limiting (express-rate-limit) | Prevents brute-force attacks |
| Helmet.js headers | HTTP security headers on all responses |
| Zod input validation | All API endpoints validate inputs |
| EXIF stripping on uploads | Prevents location metadata leakage |
| DOMPurify sanitisation | Prevents stored XSS |
| Session timeout (30 min) | Reduces risk from unattended sessions |
| PII masking in exports | Student names redacted in CSV/PDF |
| Complaint access log | Passive audit trail of every complaint view |
| Anonymous timestamp jitter | Prevents temporal correlation of anonymous reports |

---

## 8. Annual Review

This document must be reviewed annually at the start of each academic year, or immediately after any incident of P3 severity or higher.

---

## Appendix A — Student/Parent Breach Notification Email Template

**Subject:** Important Notice Regarding Your Data on Vox DPSI

Dear [Student Name / Parent/Guardian],

We are writing to inform you of a security incident involving Vox DPSI, the student grievance management system at Delhi Public School Indore.

**What happened:** [Brief description — e.g., "An unauthorised party may have accessed complaint records between [date] and [date]."]

**What information was involved:** [e.g., "Your name, school email address, and complaint descriptions."]

**What we have done:** We have [describe containment steps taken]. The vulnerability has been fixed and the system is now secure.

**What you should do:** [e.g., "If you submitted a complaint requesting anonymity, please be aware that your identity may have been visible during this period. We recommend you speak with the school coordinator if you have concerns."]

We deeply regret this incident. The privacy and safety of our students is our highest priority.

For any questions, please contact: principal@dpsi.com

Sincerely,  
Vox DPSI Team  
Delhi Public School Indore

---

## Appendix B — Principal Incident Summary Template

**Incident Date:**  
**Detected by:**  
**Severity:** P1 / P2 / P3 / P4  
**Records affected:** [number] students  
**Data categories exposed:** [e.g., names, email addresses, complaint content]  
**Anonymous complaints affected:** Yes / No  
**Root cause:**  
**Containment timeline:**  
**DPBI notification submitted:** Yes / No — Date:  
**Student notifications sent:** Yes / No — Date:  
**Remediation complete:** Yes / No  
**Lessons learned:**  
