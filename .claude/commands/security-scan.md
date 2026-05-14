# Security Scan Command
Scan the entire Vox DPSI codebase for security vulnerabilities.

## Steps
1. Read `server/index.js` — check helmet, CORS, rate limiting, input validation
2. Read all files in `server/routes/` — check for SQL injection, XSS, broken auth
3. Read `server/middleware/auth.js` and `roleGuard.js` — verify JWT validation
4. Read `server/routes/upload.js` — check file type validation, size limits
5. Read `client/src/context/AuthContext.jsx` — check token handling
6. Check for any `.env` files accidentally committed
7. Check for hardcoded secrets/keys in any file

## Report Format
For each finding:
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **File:** path/to/file.js:line
- **Issue:** Description
- **Fix:** Concrete code fix

Sort by severity. Stop if you find CRITICAL issues — those must be fixed first.
