# Staging Environment Setup

## Architecture Comparison

| Component | Production | Staging |
|-----------|------------|---------|
| **Frontend** | Vercel (vox-dpsi.vercel.app) | Vercel (vox-dpsi-staging.vercel.app) |
| **Backend** | Railway (vox-dpsi-production-6d95.up.railway.app) | Railway (vox-dpsi-staging.up.railway.app) |
| **Database** | Supabase (gznhziptmydkalsrazpj) | Supabase (staging-xxxxxxxxxxxx) |
| **Env Vars** | Production keys | Staging/test keys |
| **Data** | Live student/data | Anonymized test data |
| **Access** | Public (parents, staff) | Internal testing only |

## Step-by-Step Setup

### 1. Create Supabase Staging Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `vox-dpsi-staging`
4. Set password and note it down
5. Wait for project to initialize
6. Get the project ID from the URL (it will be in the format: `xxxxxxxxxxxxxxxxxxxxxx`)

### 2. Apply Schema to Staging Database
1. In Supabase dashboard, go to SQL Editor
2. Run `schema_and_seed.sql` to create tables and test data
3. Apply pending migrations in order:
   - `migration_delegation.sql`
   - `migration_consensus.sql`  
   - `migration_term_limits.sql`

### 3. Create Railway Staging Service
1. Go to https://railway.app/dashboard
2. Click "New" → "Deploy from GitHub"
3. Select the VOX-DPSI repository
4. Set environment:
   - Name: `vox-dpsi-staging`
   - Branch: `main` (or create a staging branch)
5. Set environment variables (copy from production but change values):
   ```
   PORT=5000
   SUPABASE_URL=https://[staging-project-id].supabase.co
   SUPABASE_SERVICE_KEY=[staging-service-role-key]
   JWT_SECRET=[staging-secret-min-32-chars]
   CLIENT_URL=https://vox-dpsi-staging.vercel.app
   
   # Email (can use same or test account)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=[test-email@gmail.com]
   SMTP_PASS=[test-app-password]
   SMTP_FROM="Vox DPSI Staging <[test-email@gmail.com]>"
   
   # WhatsApp (keep sandbox for testing)
   TWILIO_ACCOUNT_SID=[twilio-sid]
   TWILIO_AUTH_TOKEN=[twilio-token]
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ADMIN_WHATSAPP_NUMBER=+916268549591
   
   # MSG91 (optional for staging)
   MSG91_AUTH_KEY=[msg91-key-if-available]
   MSG91_SENDER_ID=VOXDPS
   MSG91_OTP_TEMPLATE_ID=[msg91-otp-template-id]
   MSG91_WA_TEMPLATE_ID=[msg91-wa-template-id-if-approved]
   ```

### 4. Create Vercel Staging Deployment
1. Go to https://vercel.com/dashboard
2. Click "New Project" → Import Git Repository
3. Select VOX-DPSI repository
4. Configure:
   - Framework: Vite
   - Root Directory: client
   - Build Command: `cd client && npm install && npm run build`
   - Output Directory: client/dist
   - Development Command: `cd client && npm run dev`
5. Set environment variables:
   ```
   VITE_API_URL=https://vox-dpsi-staging.up.railway.app
   VITE_SUPABASE_URL=https://[staging-project-id].supabase.co
   VITE_SUPABASE_ANON_KEY=[staging-anon-key]
   ```
6. Deploy! Vercel will give you a staging subdomain.

### 5. Git Workflow Instructions
1. **Feature Development**: Work on feature branches
   ```
   git checkout -b feature/awesome-feature
   # make changes
   git add .
   git commit -m "feat: awesome feature"
   git push origin feature/awesome-feature
   ```
2. **Staging Testing**: Create PR to staging branch (if exists) or main with `[STAGING]` label
   - GitHub Actions can auto-deploy to staging on PR to main
   - Or manually deploy staging branch to staging environments
3. **Production Release**: After staging validation
   ```
   git checkout main
   git merge --no-ff feature/awesome-feature
   git push origin main
   ```
   - This triggers auto-deploy to production on both Vercel and Railway

## Test Accounts Information

Use these credentials for testing in staging (all passwords: `demo123`):

### Students
- `5411@student.dpsindore.org` (Student, Scholar No: 5411)
- `5001@student.dpsindore.org` (Student, Scholar No: 5001)
- `5002@student.dpsindore.org` (Student, Scholar No: 5002)

### Staff
- `council@dpsi.com` (Council Member)
- `teacher@dpsi.com` (Class Teacher)
- `coordinator@dpsi.com` (Coordinator)
- `principal@dpsi.com` (Principal)
- `supervisor@dpsi.com` (Supervisor)

### Guardians (for VPC testing)
- `guardian@dpsi.com` (Guardian - link to student 5411 using scholar number)

## Important Notes

### Data Isolation
- Staging uses completely separate database and file storage
- No risk of contaminating production data
- Safe to test erasure requests, bulk actions, etc.

### Testing Limitations
- Email notifications: Use test email accounts or Mailtrap
- SMS/WhatsApp: May be in sandbox/test mode
- File uploads: Goes to staging Supabase storage bucket
- Real external services (like actual SMS delivery) may not work

### Refreshing Staging Data
To refresh staging data from production (anonymized):
1. On production: `pg_dump --no-owner --no-acronyms -Fc db-name > prod-backup.dump`
2. Transfer dump to staging environment
3. On staging: `pg_restore --clean --no-owner --no-acronyms -d db-name prod-backup.dump`
4. Run anonymization script on PII fields (names, emails, etc.)

### Troubleshooting
- **502 Bad Gateway**: Check Railway logs, restart service if needed
- **Build Failures**: Check Vercel build logs, ensure environment vars set
- **Database Connection**: Verify Supabase URL and keys are correct
- **CORS Issues**: Ensure CLIENT_URL matches exactly what Vercel gives you

Last Updated: May 2026
Review Required: Before major releases or quarterly