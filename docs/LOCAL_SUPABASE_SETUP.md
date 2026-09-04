# Local Supabase setup

The Kisok Admin project is pinned to **Node 24** through `.nvmrc`. The environment now has Node.js `v24.19.0`, pnpm `10.4.1`, Docker Engine `29.7.2`, Docker Compose `v5.5.0`, and Supabase CLI `2.115.0` available through the project’s `pnpm supabase` script.

## Normal setup

Use a shell that has loaded nvm, select the project runtime, and ensure the user can access the Docker socket:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24
cd /home/ubuntu/Kisok_nextjs
sudo usermod -aG docker "$USER"
newgrp docker
pnpm install --frozen-lockfile
pnpm supabase start
pnpm verify:lean-v2
```

The verification script performs two clean database resets and runs the supplied static validator, database lint, and pgTAP suites. The project’s `supabase/config.toml`, 13 Lean V2 migrations, `supabase/seed.sql`, and two pgTAP suites are already present in the repository.

## Current sandbox result

Docker package installation completed, and the Docker daemon can run simple host-network containers. The full Supabase stack cannot start in this sandbox because the host kernel does not expose the iptables raw/nftables facilities required by Docker’s default bridge networking. Running rootful Docker with `--iptables=false --ip6tables=false` bypasses the first rule-creation failure, but user-defined bridge containers cannot communicate: the Supabase Realtime migration container times out while connecting to Postgres. Rootless Docker was also attempted; slirp4netns cannot create its TUN interface because the sandbox kernel returns `No such device`. Supabase’s `--network-id host` fallback is rejected because the CLI requires user-defined network aliases.

This is an environment limitation rather than a migration or application failure. A Docker host with normal bridge networking, iptables/nftables support, or a managed local Docker Desktop engine is required for the final runtime gate. Do not mark Local Supabase acceptance as passed until `pnpm verify:lean-v2` completes successfully twice.

## Browser environment variables

After Supabase starts, populate a local `.env` from `pnpm supabase status -o env` and retain only the public URL/publishable key for the browser. Keep `SUPABASE_SERVICE_ROLE_KEY` and Cloudinary secrets server-only. The Admin route will intentionally remain unavailable until an authenticated user resolves through the trusted `current_active_profile()` RPC.

## Local login credentials

`supabase/seed.sql` inserts `auth.users` rows with `encrypted_password = ''` only so `profiles(id)`'s foreign key is satisfiable during `supabase db reset` — that value is not a real password hash and cannot authenticate. After `supabase db reset` completes, run:

```bash
pnpm seed:local-auth
```

(cross-platform — this replaced separate `.sh`/`.ps1` scripts) against the running local instance to create working local logins through the Auth Admin API. The script explicitly resets the password on every run, including for a user that already exists (e.g. the one `seed.sql` created with the unusable empty hash above) — it never treats "the user already exists" as "the password is already usable". See `scripts/lib/local-auth-seed.ts` and its test for the exact behavior:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@kiosk.local` | `KioskLocalAdmin123!` |
| Preparation | `preparation@kiosk.local` | `KioskLocalPreparation123!` |
| Customer | `customer@kiosk.local` | `KioskLocalCustomer123!` |

These are local-development-only credentials; both scripts refuse to run against a non-local `API_URL`. They are independent of the hosted test project's `Admin@gmail.com` account, which is provisioned directly in that Supabase project, not through this seed.
