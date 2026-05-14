# QA Run Command
Run the full Vox DPSI QA checklist against the live app.

## Prerequisites
- Backend running (check `/health` endpoint)
- Frontend running
- All 6 demo accounts available (password: demo123)

## Test Checklist
For each test, report PASS or FAIL with details.

### Authentication
1. Login as student (5411@student.dpsindore.org) → redirects to StudentDashboard
2. Login as council (council@dpsi.com) → redirects to CouncilDashboard
3. Login as teacher (teacher@dpsi.com) → redirects to TeacherDashboard
4. Login as coordinator (coordinator@dpsi.com) → redirects to CoordinatorDashboard
5. Login as principal (principal@dpsi.com) → redirects to PrincipalDashboard
6. Login as supervisor (supervisor@dpsi.com) → redirects to SupervisorDashboard
7. Wrong password → shows error, no crash
8. Rate limiting → 5th attempt shows 429

### Complaint Lifecycle
9. Student raises complaint (anonymous) → gets VOX-XXXX number
10. Student raises complaint (not anonymous) → gets VOX-XXXX number
11. Council sees anonymous complaint → real name + "(Anon Req)" badge
12. Council verifies complaint → status changes to "verified"
13. Council escalates (hide identity) → teacher sees "Anonymous Student"
14. Council escalates (reveal identity) → teacher sees real name
15. Teacher resolves → status "resolved", timeline logged
16. Student can reopen resolved → status "reopened"
17. Principal exports CSV → downloads file

### Security
18. Student A cannot see Student B's complaints
19. Unauthenticated request → 401
20. Student cannot access admin endpoints → 403
21. File upload rejects non-image files
22. File upload rejects files > 5MB

### UI
23. No horizontal scroll on any page
24. Loading states show (not blank screens)
25. Toast notifications appear for all actions
26. Hindi toggle works on student pages
27. PWA manifest valid

## Report Format
```
QA RESULTS: X/27 PASSING

FAILURES:
- Test #X: [description] — [what happened]
```
