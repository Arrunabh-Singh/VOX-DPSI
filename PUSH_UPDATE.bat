@echo off
title Vox DPSI — Push Bug Fixes
echo.
echo ============================================
echo   Pushing anonymity + escalation fixes
echo ============================================
echo.
cd /d "%~dp0vox-dpsi"
git add server/routes/complaints.js client/src/pages/ComplaintDetail.jsx client/src/components/EscalateModal.jsx .gitignore
git commit -m "Fix escalation flow and anonymity bugs

- Teacher/coordinator escalate guard: only current handler can escalate
- Teacher GET query: use current_handler_role filter (fixes in_progress visibility)
- Coordinator GET query: remove duplicate .or() filter
- Principal escalation: always reveal identity, no reveal option shown
- ComplaintDetail: show student info to teachers, show anon badge to all staff
- canMarkInProgress: extended to teacher and coordinator levels"
git push origin main
echo.
echo Done! Vercel will auto-deploy from GitHub.
pause
