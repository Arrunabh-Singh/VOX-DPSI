# ============================================================
# Vox DPSI — One-Click Deployment Script
# Right-click this file → "Run with PowerShell"
# ============================================================

$ErrorActionPreference = "Continue"
$ProjectDir = "$PSScriptRoot\vox-dpsi"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Vox DPSI — Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Install dependencies ─────────────────────────────
Write-Host "[ 1/6 ] Installing server dependencies..." -ForegroundColor Yellow
Set-Location "$ProjectDir\server"
npm install --silent
Write-Host "        ✓ Server deps installed" -ForegroundColor Green

Write-Host "[ 2/6 ] Installing client dependencies..." -ForegroundColor Yellow
Set-Location "$ProjectDir\client"
npm install --silent
Write-Host "        ✓ Client deps installed" -ForegroundColor Green

# ── Step 2: Build client ──────────────────────────────────────
Write-Host "[ 3/6 ] Building React app..." -ForegroundColor Yellow
Set-Location "$ProjectDir\client"
npm run build
Write-Host "        ✓ Client built successfully" -ForegroundColor Green

# ── Step 3: Git push ──────────────────────────────────────────
Write-Host "[ 4/6 ] Pushing to GitHub..." -ForegroundColor Yellow
Set-Location $ProjectDir
git init -b main 2>$null
git config user.email "arrunabh.s@gmail.com"
git config user.name "Arrunabh Singh"
git remote remove origin 2>$null
git remote add origin https://github.com/Arrunabh-Singh/VOX-DPSI.git
git add .
git commit -m "Vox DPSI complete build" 2>$null
git branch -M main
git push -u origin main --force
Write-Host "        ✓ Pushed to GitHub" -ForegroundColor Green

# ── Step 4: Deploy to Vercel ──────────────────────────────────
Write-Host "[ 5/6 ] Deploying frontend to Vercel..." -ForegroundColor Yellow
Set-Location $ProjectDir
npx vercel --yes --prod `
  --env VITE_API_URL=https://vox-dpsi-server.up.railway.app `
  --env VITE_SUPABASE_URL=https://gznhziptmydkalsrazpj.supabase.co `
  --env "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bmh6aXB0bXlka2Fsc3JhenBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTA0MzEsImV4cCI6MjA5MjA2NjQzMX0.SIEiybKYgFBB2ozbR0kEh4gGiMur1yWqeEoZ_qDuyEQ"
Write-Host "        ✓ Vercel deployment triggered" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   DONE! Check output above for URLs." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor White
Write-Host "  1. Go to railway.app → New Project → Deploy from GitHub" -ForegroundColor Gray
Write-Host "     Repo: Arrunabh-Singh/VOX-DPSI, Root: /server" -ForegroundColor Gray
Write-Host "     Add env vars from vox-dpsi/server/.env" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Run schema in Supabase SQL editor:" -ForegroundColor Gray
Write-Host "     https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql" -ForegroundColor Gray
Write-Host "     Paste contents of vox-dpsi/schema.sql, then vox-dpsi/seed.sql" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to exit"
