@echo off
title Vox DPSI - Seed Database
echo.
echo ============================================
echo   VOX DPSI -- Schema Patch + Seed Runner
echo ============================================
echo.
cd /d "%~dp0vox-dpsi"

echo [Step 1] Applying schema patch (adding missing columns)...
node server/patch_schema.mjs
echo.

echo [Step 2] Running seed data...
node server/run_seed.mjs
echo.
pause
