$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

Write-Host "== KIOSK V2 Lean local verification =="

pnpm supabase --version
pnpm supabase start
pnpm supabase status

python .\scripts\static_validate.py

Write-Host "== Clean reset #1 =="
pnpm supabase db reset --local
pnpm supabase db lint --local --level error --fail-on error
pnpm supabase test db --local

Write-Host "== Clean reset #2 =="
pnpm supabase db reset --local
pnpm supabase db lint --local --level error --fail-on error
pnpm supabase test db --local

Write-Host "== Create reproducible local login users =="
pnpm exec tsx .\scripts\seed-local-auth.ts

Write-Host "PASS: two clean local rebuild/test cycles completed."
