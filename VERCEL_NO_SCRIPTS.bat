@echo off
title Vox DPSI - Vercel Deploy (no scripts)
echo.
echo ============================================
echo   VOX DPSI -- Vercel Deploy (fixed)
echo ============================================
echo.

set "PROJECT_DIR=%~dp0vox-dpsi"

echo [1/3] Installing Vercel CLI (skipping postinstall)...
call npm install -g vercel@51.7.0 --ignore-scripts
echo.

echo [2/3] Vercel login...
echo (Browser will open -- sign in, then return here)
call vercel login
echo.

echo [3/3] Deploying...
cd /d "%PROJECT_DIR%"
call vercel --yes --prod ^
  --env VITE_API_URL=https://vox-dpsi-server.up.railway.app ^
  --env VITE_SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co ^
  --env "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bmh6aXB0bXlka2Fsc3JhenBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTA0MzEsImV4cCI6MjA5MjA2NjQzMX0.SIEiybKYgFBB2ozbR0kEh4gGiMur1yWqeEoZ_qDuyEQ"

echo.
pause
