@echo off
cd /d "%~dp0vox-dpsi"
echo Running patch + seed, capturing output...
(
  echo === PATCH ===
  node server/patch_schema.mjs
  echo === SEED ===
  node server/run_seed.mjs
  echo === EXIT %ERRORLEVEL% ===
) > "%~dp0seed_output.txt" 2>&1
echo Done. Output in seed_output.txt
