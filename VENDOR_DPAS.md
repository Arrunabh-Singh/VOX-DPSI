# Vendor Data Processing Agreements (DPAs)

## Current DPA Status

| Vendor | Service | DPA Status | Notes | Last Verified |
|--------|---------|------------|-------|---------------|
| **Supabase** | Database & Storage | ✅ Compliant | GDPR-compliant, DPA available in Trust Center | May 2026 |
| **Vercel** | Frontend Hosting | ✅ Compliant | GDPR-compliant, DPA available via Legal Hub | May 2026 |
| **Railway** | Backend Hosting | ✅ Compliant | GDPR-compliant, DPA available on request | May 2026 |
| **Twilio** | WhatsApp (Future) | ⚠️ Pending | Sandbox only - DPA required for production | May 2026 |
| **Google Fonts** | Typography | ✅ Compliant | No DPA required - public service, no PII processed | May 2026 |
| **Gmail/SMTP** | Email Notifications | ✅ Compliant | Covered under Google Workspace DPA | May 2026 |
| **MSG91** | SMS Notifications | ⚠️ Pending | Indian provider - DPA under review for DPDP Act 2023 | May 2026 |

## Required Actions for School Administration

### Immediate Actions (Completed)
1. ✅ Review and acknowledge Supabase DPA via Trust Center
2. ✅ Verify Vercel DPA availability in account settings
3. ✅ Confirm Railway DPA compliance documentation
4. ✅ Verify Google Workspace (Gmail) DPA for SMTP notifications

### Pending Actions
1. **Twilio WhatsApp** (#27)
   - Upgrade from sandbox to production account
   - Execute Twilio DPA for WhatsApp Business API
   - Configure Opt-out mechanisms per DPDP Act

2. **MSG91 SMS** (#46)
   - Obtain DPA from MSG91 for Indian data protection compliance
   - Verify data localization practices
   - Configure explicit consent mechanisms for SMS

### Annual Review Requirements
- Review all vendor DPAs annually
- Confirm no material changes to data processing terms
- Update records of processing activities (ROPA)
- Ensure subprocessor lists are current

## Data Flows Summary

### Personal Data Collected
- **Student Data**: Name, email, scholar number, section, house, complaints
- **Parent Data**: Email/phone (for VPC only)
- **Staff Data**: Name, email, role
- **Guardian Data**: Name, email/phone (optional linkage)

### Data Flow by Vendor

#### Supabase
- **Data Stored**: All PII, complaint data, audit logs
- **Location**: Singapore region (primary)
- **Encryption**: At rest and in transit (TLS 1.3)
- **Access**: Strict IAM controls, service keys only

#### Vercel
- **Data Transmitted**: Static assets only (no PII storage)
- **Data Type**: JS bundles, images, fonts (public)
- **Processing**: Edge caching, no PII retention

#### Railway
- **Data Processed**: Complaint processing, notifications, auth logic
- **Data Type**: In-memory processing, logs (PII-minimized)
- **Storage**: Ephemeral containers, no persistent PII storage

#### Twilio (Future)
- **Data Transmitted**: Phone numbers, message content (template-based)
- **PII Minimization**: Uses hashed identifiers where possible
- **Region**: Global (select India region for data locality)

#### MSG91 (Future)
- **Data Transmitted**: Phone numbers, OTPs, alert messages
- **PII Minimization**: Template-based messaging
- **Location**: India-based servers

#### Email (Gmail/SMTP)
- **Data Transmitted**: Notification content, recipient emails
- **PII**: Limited to what's in notification templates
- **Encryption**: TLS for transmission

## Legal Basis for Processing

### Primary Basis: Legitimate Interest
- Student welfare and safety (DPDP Act Section 4)
- School's duty of care under Indian education regulations

### Secondary Basis: Consent
- Parental consent for student processing (VPC flow)
- Optional consent for WhatsApp/SMS notifications
- Privacy notice acknowledgment for all users

## Data Subject Rights Implementation

### Right to Access
- Available via `/api/users/me` endpoint
- Export functionality planned for principal role

### Right to Rectification
- Profile updates via `/api/users/me`
- Admin correction requests via support

### Right to Erasure
- Formal requests via `/api/auth/erasure-request`
- Principal approval workflow
- 30-day response timeline per DPDP Act

### Right to Restrict Processing
- Anonymity requests for complaints
- Opt-out for notifications (planned)
- Processing limitations per user preferences

## Security Measures

### Technical Controls
- **Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Access Control**: RBAC, least privilege, MFA for admins
- **Monitoring**: Audit logs, intrusion detection
- **Backups**: Encrypted, geo-redundant, tested quarterly

### Organizational Controls
- **Training**: Annual data protection training for staff
- **Incident Response**: Breach notification plan (see B1)
- **Vendor Management**: Annual DPA reviews, security questionnaires
- **Data Minimization**: Collect only necessary PII

## Contact Information

**Data Protection Officer**: schoolit@dpsi.edu.in
**Principal**: principal@dpsi.edu.in
**Vendor Contacts**: Available in individual DPA documents

Last Updated: May 9, 2026
Review Schedule: Annual (May 2027)