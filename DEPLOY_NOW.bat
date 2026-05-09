@echo off
setlocal enabledelayedexpansion
title Vox DPSI Deployment

echo.
echo ============================================
echo   VOX DPSI -- Complete Deployment Script
echo ============================================
echo.

set "PROJECT_DIR=%~dp0vox-dpsi"
echo Project folder: %PROJECT_DIR%
echo.

REM ---------- Remove stale git locks ----------
echo [1/7] Cleaning git lock files...
if exist "%PROJECT_DIR%\.git\config.lock" del /f "%PROJECT_DIR%\.git\config.lock"
if exist "%PROJECT_DIR%\.git\index.lock"  del /f "%PROJECT_DIR%\.git\index.lock"
echo       Done.
echo.

REM ---------- Git setup ----------
echo [2/7] Configuring git...
cd /d "%PROJECT_DIR%"
git init -b main 2>nul
git config user.email "arrunabh.s@gmail.com"
git config user.name "Arrunabh Singh"
echo       Done.
echo.

REM ---------- Set remote ----------
echo [3/7] Setting GitHub remote...
git remote remove origin 2>nul
git remote add origin https://github.com/Arrunabh-Singh/VOX-DPSI.git
echo       Remote: https://github.com/Arrunabh-Singh/VOX-DPSI.git
echo.

REM ---------- Stage & commit ----------
echo [4/7] Staging and committing files...
git add .
git status --short
git commit -m "Vox DPSI complete build - full-stack student grievance system" 2>nul
if %ERRORLEVEL%==0 (
  echo       Committed successfully.
) else (
  echo       Nothing new to commit, or commit already exists.
)
git branch -M main
echo.

REM ---------- Push to GitHub ----------
echo [5/7] Pushing to GitHub...
echo       (If a login window pops up, sign in with your GitHub account)
git push -u origin main --force
if %ERRORLEVEL%==0 (
  echo       SUCCESS: Code pushed to GitHub!
) else (
  echo       PUSH FAILED -- Check your GitHub credentials and try again.
  echo       Repo: https://github.com/Arrunabh-Singh/VOX-DPSI
  pause
  exit /b 1
)
echo.

REM ---------- Vercel deploy ----------
echo [6/7] Deploying frontend to Vercel...
echo       (A browser may open for Vercel login if not already authenticated)
cd /d "%PROJECT_DIR%"
npx vercel --yes --prod ^
  --env VITE_API_URL=https://vox-dpsi-server.up.railway.app ^
  --env VITE_SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co ^
  --env "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bmh6aXB0bXlka2Fsc3JhenBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTA0MzEsImV4cCI6MjA5MjA2NjQzMX0.SIEiybKYgFBB2ozbR0kEh4gGiMur1yWqeEoZ_qDuyEQ"
echo.

echo [7/7] Done!
echo.
echo ============================================
echo   NEXT STEPS:
echo   1. Railway backend:
echo      - Go to https://railway.app
echo      - New Project -> Deploy from GitHub
echo      - Repo: Arrunabh-Singh/VOX-DPSI
echo      - Root directory: /server
echo      - Add env vars from vox-dpsi/server/.env
echo.
echo   2. Supabase schema + seed:
echo      - Go to https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql
echo      - Paste contents of vox-dpsi/schema.sql  (run)
echo      - Paste contents of vox-dpsi/seed.sql    (run)
echo ============================================
echo.
pause
