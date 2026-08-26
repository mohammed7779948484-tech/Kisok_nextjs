#!/usr/bin/env bash
# Bash port of seed-local-auth.ps1 for Linux/macOS contributors. Creates (or
# reuses) local-only Auth users with real passwords through the Supabase
# Admin API, then upserts matching public.profiles rows — the raw SQL
# `supabase/seed.sql` inserts auth.users with an empty encrypted_password
# only to satisfy the profiles FK during `supabase db reset`; it is not a
# working login on its own.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

command -v jq >/dev/null 2>&1 || {
  echo "This script requires 'jq'. Install it and re-run." >&2
  exit 1
}

STATUS="$(pnpm supabase status -o env)"
API_URL="$(printf '%s\n' "$STATUS" | sed -n 's/^API_URL="\{0,1\}\(.*[^"]\)"\{0,1\}$/\1/p' | head -n1)"
SERVICE_ROLE_KEY="$(printf '%s\n' "$STATUS" | sed -n 's/^SERVICE_ROLE_KEY="\{0,1\}\(.*[^"]\)"\{0,1\}$/\1/p' | head -n1)"

if [[ -z "$API_URL" || -z "$SERVICE_ROLE_KEY" ]]; then
  echo "Local API_URL or SERVICE_ROLE_KEY was not returned by 'supabase status -o env'." >&2
  exit 1
fi

case "$API_URL" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *)
    echo "Refusing to seed Auth because API_URL is not local: $API_URL" >&2
    exit 1
    ;;
esac

seed_user() {
  local email="$1" password="$2" display_name="$3" role="$4"

  local existing_id
  existing_id="$(curl -sS -X GET "$API_URL/auth/v1/admin/users?page=1&per_page=1000" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    | jq -r --arg email "$email" '.users[]? | select(.email == $email) | .id' | head -n1)"

  local user_id
  if [[ -z "$existing_id" ]]; then
    user_id="$(curl -sS -X POST "$API_URL/auth/v1/admin/users" \
      -H "apikey: $SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -d "$(jq -n --arg email "$email" --arg password "$password" \
        '{email: $email, password: $password, email_confirm: true}')" \
      | jq -r '.id')"
    echo "Created local Auth user: $email"
  else
    user_id="$existing_id"
    echo "Local Auth user already exists: $email"
  fi

  curl -sS -X POST "$API_URL/rest/v1/profiles?on_conflict=id" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates,return=minimal" \
    -d "$(jq -n --arg id "$user_id" --arg display_name "$display_name" --arg role "$role" --arg email "$email" \
      '{id: $id, display_name: $display_name, role: $role, is_active: true, email: $email}')" \
    >/dev/null
}

seed_user "admin@kiosk.local" "KioskLocalAdmin123!" "Local Admin" "admin"
seed_user "preparation@kiosk.local" "KioskLocalPreparation123!" "Local Preparation" "preparation"
seed_user "customer@kiosk.local" "KioskLocalCustomer123!" "Local Customer" "customer"

cat <<'EOF'

Local development logins:
  Admin       admin@kiosk.local / KioskLocalAdmin123!
  Preparation preparation@kiosk.local / KioskLocalPreparation123!
  Customer    customer@kiosk.local / KioskLocalCustomer123!

These credentials are LOCAL DEVELOPMENT ONLY.
EOF
