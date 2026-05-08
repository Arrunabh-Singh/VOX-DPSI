# Vox DPSI — Data Protection Impact Assessment (DPIA)

**Document:** DPIA.md  
**System:** Vox DPSI — Student Grievance Management System  
**Organisation:** Delhi Public School Indore  
**Data Fiduciary:** School Principal, DPS Indore  
**Technical Lead:** Arrunabh Singh (Student Council President)  
**Assessment Date:** May 2026  
**Review Due:** May 2027 or upon material system change  

---

## 1. Purpose of This Assessment

This Data Protection Impact Assessment (DPIA) evaluates the privacy risks of Vox DPSI and documents the measures taken to mitigate them. It is prepared in accordance with:

- **Digital Personal Data Protection (DPDP) Act 2023** — India's primary data protection legislation
- **DPDP Act Section 9** — mandatory parental consent and special protections for children's data
- **IT Act 2000, Section 43A** — reasonable security for sensitive personal data
- **Good practice guidance** modelled on GDPR Article 35 DPIA frameworks, adapted for India

A DPIA is required because Vox DPSI processes **sensitive personal data of children** (students under 18) relating to grievances that may include reports of abuse, harassment, discrimination, and mental health disclosures.

---

## 2. System Description

### 2.1 What the system does

Vox DPSI allows students of DPS Indore to:
- Submit complaints about school-related issues (academics, safety, personal welfare, behaviour, infrastructure)
- Track complaint status through a defined escalation pathway
- Request anonymity so their identity is protected from teachers and administrators unless they consent to disclosure

The system processes complaints through a hierarchy: Student Council Member → Class Teacher → Coordinator → Principal, with optional supervisor oversight.

### 2.2 Technical architecture

| Component | Technology | Location |
|-----------|-----------|----------|
| Frontend | React 18 + Vite + Tailwind CSS | Vercel (Singapore region) |
| Backend API | Node.js + Express | Railway (Singapore region) |
| Database | PostgreSQL via Supabase | Supabase (ap-southeast-1) |
| File storage | Supabase Storage | Supabase (ap-southeast-1) |
| Authentication | JWT via HttpOnly cookie | In-process (Railway) |
| Email notifications | SMTP via Nodemailer | Railway outbound SMTP |
| SMS/WhatsApp | Twilio (sandbox) | Twilio cloud (US) |

> **Planned migration:** Supabase and Vercel will be migrated to `ap-south-1` (Mumbai) to keep data within India. This is tracked as task #81. Until migration is complete, data flows through Singapore.

### 2.3 Data processed

| Data Category | Subjects | Sensitivity |
|---------------|---------|-------------|
| Full name, email, scholar number | Students, staff | Medium |
| Section, house affiliation | Students | Low |
| Complaint description (free text) | Students | **High** — may contain abuse/harassment disclosures |
| Complaint attachments (images/documents) | Students | **High** |
| Anonymous identity flag + actual identity | Students | **High** |
| Escalation consent decisions | Students, Council members | Medium |
| CSAT ratings and feedback | Students | Low |
| Role delegation records | Council members | Low |
| Consensus voting records | Council members | Medium |
| Access logs (who viewed what complaint, when) | All roles | Medium |
| Parent/guardian phone numbers (VPC flow) | Parents | High |
| OTP verification records | Parents | Medium |

---

## 3. Necessity and Proportionality

### 3.1 Purpose limitation

Data collected in Vox DPSI is used exclusively for:
1. Processing and resolving student grievances
2. Generating anonymised analytics for school improvement (principal/coordinator view)
3. Sending notifications to complaint handlers
4. Complying with legal obligations (POSH Act, POCSO Act audit trails)

No data is shared with third parties for marketing, advertising, or any purpose unrelated to grievance resolution.

### 3.2 Data minimisation

- Students are not required to provide home addresses or phone numbers
- Anonymous complaints withhold identity from all handlers except the assigned council member
- PII is masked in all CSV/PDF exports
- Complaint descriptions visible to teachers/coordinators are only accessible after council member grants access
- Deleted or erasure-requested data is purged after the retention period

### 3.3 Retention

| Data Type | Retention Period | Basis |
|-----------|-----------------|-------|
| Active complaints | Until resolved + 2 years | School record-keeping requirements |
| Resolved complaints | 2 years from closure | School records + POSH/POCSO audit |
| POSH/POCSO-flagged complaints | 7 years | POSH Act Section 11 requirement |
| User accounts (students) | Until graduation + 1 year | School records |
| Audit logs | 3 years | IT Act compliance |
| Erasure requests | 30 days processing, then purged | DPDP Act compliance |

---

## 4. Risk Assessment

### 4.1 Risk register

| # | Risk | Likelihood | Impact | Overall | Mitigation |
|---|------|-----------|--------|---------|-----------|
| R1 | Anonymous student identity exposed to teacher/coordinator | Low | Critical | **High** | RLS policies; council member consent gate; `is_identity_revealed` flag in DB |
| R2 | Student complaint containing abuse disclosure seen by the abuser (if abuser is a teacher) | Medium | Critical | **High** | POSH/POCSO auto-triage routes to IC directly, bypassing class teacher |
| R3 | Supabase credentials leaked via GitHub | Low | Critical | **High** | .gitignore on .env; environment variables in Railway dashboard; regular rotation policy |
| R4 | JWT token stolen via XSS | Very Low | High | **Medium** | HttpOnly cookies (task #51); DOMPurify sanitisation; CSP headers via Helmet |
| R5 | Unauthorised bulk export of student data | Low | High | **Medium** | Export functions restricted to principal/coordinator roles; PII masking in output |
| R6 | Council member accesses complaint outside their assignment | Low | Medium | **Low** | RLS: council members can only SELECT complaints where `assigned_council_member_id = auth.uid()` |
| R7 | Student submits GDPR erasure request for POSH/POCSO complaint | Low | Medium | **Medium** | Erasure requests for POSH/POCSO data are deferred — legal hold flag in DB |
| R8 | Parent WhatsApp/SMS number used beyond VPC notification | Low | Low | **Low** | Phone number only stored for VPC flow; not used for marketing; Twilio data processing agreement covers this |
| R9 | Data residency — data stored outside India (Singapore) | Medium | Medium | **Medium** | Mumbai migration (#81) planned; interim DPA with Supabase/Vercel/Railway covers data flow |
| R10 | Minor accesses system from shared/family device | Medium | Medium | **Medium** | Session timeout (30 min); quick exit button; no credentials in localStorage |

### 4.2 Residual risk acceptance

After mitigations applied:
- **R1, R2, R3** — residual risk is **Low** given implemented controls
- **R9** — residual risk is **Medium** until Mumbai migration completed (tracked as task #81)
- All other risks — residual **Low**

---

## 5. Privacy by Design Implementation

Vox DPSI was designed with privacy as a core principle, not an afterthought:

### 5.1 Data protection measures implemented

| Principle | Implementation |
|-----------|---------------|
| **Lawful basis** | Students/parents provide explicit consent at first login (VPC gate + privacy notice) |
| **Purpose limitation** | Data used only for grievance processing; no secondary uses |
| **Data minimisation** | Only fields necessary for grievance management collected |
| **Accuracy** | Students can view and update their own complaint information |
| **Storage limitation** | Auto-archive after 2 years; erasure request mechanism |
| **Integrity & confidentiality** | HttpOnly cookies, RLS, encryption at rest (Supabase default), HTTPS everywhere |
| **Accountability** | Audit log on every complaint view; full timeline on every action |

### 5.2 Children's data (DPDP Act Section 9)

All users are presumed to be under 18 unless otherwise established. The system implements:

- **Verifiable Parental Consent (VPC):** Students cannot use the system without a parent/guardian completing an OTP-verified consent flow on first login
- **Age-appropriate privacy notice:** Plain-language consent screen written for students, not lawyers
- **No behavioural tracking:** No analytics cookies, no A/B testing, no advertising pixels
- **No data sharing for profiling:** Student data is never used to create behavioural profiles
- **Quick exit button:** Students can immediately clear the app from view for safety

---

## 6. Data Subject Rights

Under the DPDP Act, students and parents have the following rights, all implemented in Vox DPSI:

| Right | How exercised | Implemented |
|-------|--------------|-------------|
| Right to access | Student can view all their complaints and timeline | ✅ |
| Right to correction | Student can edit their profile information | ✅ |
| Right to erasure | Data erasure request form available in student settings | ✅ |
| Right to grievance redressal | Complaints can be reopened within 7 days; principal is final escalation | ✅ |
| Right to withdraw consent | Parent can withdraw VPC consent; account is suspended pending review | ✅ (VPC flow) |
| Right to nominate | Parents act as nominees for minors | ✅ (VPC/guardian role) |

---

## 7. Third-Party Data Processors

| Processor | Data Shared | Basis | DPA Status |
|-----------|------------|-------|-----------|
| Supabase Inc. | Database + storage (all data) | Data processing; Supabase DPA auto-applies on Pro plan | Covered by Supabase standard DPA |
| Vercel Inc. | Frontend files only (no user data in transit) | Hosting; Vercel DPA available | Vercel standard DPA (task #75) |
| Railway Corp. | Backend process (API requests, env vars) | Hosting; Railway DPA | Railway standard DPA (task #75) |
| Twilio Inc. | Parent phone numbers (WhatsApp/SMS) | Notification delivery | Twilio standard DPA |
| Google SMTP / School SMTP | Email addresses | Notification delivery | Subject to school's existing Google Workspace agreement |

---

## 8. Consultation

Before deployment to production, the following stakeholders were consulted:

- **School Principal** — approved the grievance workflow and escalation structure
- **Student Council** — reviewed anonymity protections and consent flows
- **Parents/Guardians** — VPC consent flow explained to parent body

No formal Data Protection Officer exists at DPS Indore (the Act's DPO requirement applies to "significant data fiduciaries" as designated by the central government). DPS Indore is not currently a designated significant data fiduciary.

---

## 9. Conclusion and Sign-off

This DPIA concludes that Vox DPSI, as currently implemented:

1. Processes student data on a lawful basis (consent via VPC gate)
2. Applies appropriate technical and organisational measures for a school-level system
3. Implements meaningful anonymity protections for vulnerable complainants
4. Provides POSH/POCSO-compliant routing for serious complaints
5. Meets DPDP Act Section 9 requirements for children's data processing

**Outstanding items before full production launch:**
- Mumbai data residency migration (#81) to eliminate cross-border data flow
- Formal Vendor DPAs signed and filed (#75)
- DPBI notification infrastructure ready upon regulator portal launch

**Assessment outcome: APPROVED for deployment with noted outstanding items tracked.**

---

*This document should be updated whenever a material change is made to the system that affects data processing activities (new data categories, new processors, change to retention periods, or change to consent mechanisms).*
