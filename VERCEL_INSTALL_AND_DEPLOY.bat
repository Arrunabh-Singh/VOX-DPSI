@echo off
title Vox DPSI - Vercel Global Install + Deploy
echo.
echo ============================================
echo   VOX DPSI -- Install Vercel + Deploy
echo ============================================
echo.

set "PROJECT_DIR=%~dp0vox-dpsi"

echo [1/3] Installing Vercel CLI globally...
call npm install -g vercel@51.7.0 --prefer-online
if %ERRORLEVEL% neq 0 (
  echo Trying with --force...
  call npm install -g vercel --force
)
echo.

echo [2/3] Logging in to Vercel...
echo (A browser window will open — sign in with GitHub or email)
echo (After login, come back to this window)
call vercel login
echo.

echo [3/3] Deploying to Vercel...
cd /d "%PROJECT_DIR%"
call vercel --yes --prod ^
  --env VITE_API_URL=https://vox-dpsi-server.up.railway.app ^
  --env VITE_SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co ^
  --env "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bmh6aXB0bXlka2Fsc3JhenBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTA0MzEsImV4cCI6MjA5MjA2NjQzMX0.SIEiybKYgFBB2ozbR0kEh4gGiMur1yWqeEoZ_qDuyEQ"

echo.
if %ERRORLEVEL%==0 (
  echo ============================================
  echo   SUCCESS! Check above for your Vercel URL.
  echo ============================================
) else (
  echo ============================================
  echo   Something went wrong. See errors above.
  echo ============================================
)
echo.
pause
