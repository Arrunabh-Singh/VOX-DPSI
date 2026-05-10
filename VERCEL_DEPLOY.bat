@echo off
title Vox DPSI - Vercel Deploy
echo.
echo ============================================
echo   VOX DPSI -- Vercel Frontend Deploy
echo ============================================
echo.

set "PROJECT_DIR=%~dp0vox-dpsi"
cd /d "%PROJECT_DIR%"

echo Clearing npm cache for vercel...
call npm cache clean --force
echo.

echo Deploying to Vercel (vercel@51.7.0)...
echo (A browser will open for login if not authenticated)
echo.

call npx vercel@51.7.0 --yes --prod --env VITE_API_URL=https://vox-dpsi-server.up.railway.app --env VITE_SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co --env "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bmh6aXB0bXlka2Fsc3JhenBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTA0MzEsImV4cCI6MjA5MjA2NjQzMX0.SIEiybKYgFBB2ozbR0kEh4gGiMur1yWqeEoZ_qDuyEQ"

echo.
if %ERRORLEVEL%==0 (
  echo ============================================
  echo   SUCCESS! Vercel deployment complete.
  echo   Check above for your live URL.
  echo ============================================
) else (
  echo ============================================
  echo   ERROR: Vercel deploy failed.
  echo   Error code: %ERRORLEVEL%
  echo ============================================
)
echo.
pause
