#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== KIOSK V2 Lean local verification =="

pnpm supabase --version
pnpm supabase start
pnpm supabase status

python3 ./scripts/static_validate.py

echo "== Clean reset #1 =="
pnpm supabase db reset --local
pnpm supabase db lint --local --level error --fail-on error
pnpm supabase test db --local

echo "== Clean reset #2 =="
pnpm supabase db reset --local
pnpm supabase db lint --local --level error --fail-on error
pnpm supabase test db --local

echo "PASS: two clean local rebuild/test cycles completed."
