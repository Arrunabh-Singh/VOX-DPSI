# Deploy Check Command
Verify Vox DPSI is ready for deployment.

## Checks
1. **Env Vars:** All required env vars present in server/.env and client/.env
2. **Health Endpoint:** `GET /health` returns `{"status":"ok"}`
3. **Null Bytes:** No null bytes in any server JS file
4. **Syntax:** All server JS files pass `node --check`
5. **CORS:** CLIENT_URL matches Vercel domain
6. **RLS:** All Supabase tables have RLS enabled
7. **Migrations:** All 6 pending migrations have been applied
8. **Build:** `cd client && npm run build` succeeds
9. **Git Status:** No uncommitted changes (clean working tree)
10. **Demo Accounts:** All 6 demo accounts exist in DB

## Report Format
```
DEPLOY CHECK: X/10 PASSING

BLOCKERS (must fix before deploy):
- [ ] Item — [details]

WARNINGS (should fix):
- [ ] Item — [details]
```
