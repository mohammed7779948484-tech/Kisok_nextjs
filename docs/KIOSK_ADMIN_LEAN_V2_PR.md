## Summary

This PR integrates the supplied Lean V2 database contract into `Kisok_nextjs` and establishes the first real Admin route foundation. It replaces the local/demo root mount with a localized, protected App Router Admin tree and removes the obsolete financial demo dashboard.

## Included

- Added the supplied 13 Lean V2 migrations, two pgTAP suites, deterministic `supabase/seed.sql`, static validator, Auth seed helper, and two-cycle local verification scripts.
- Initialized `supabase/config.toml` and added repeatable `pnpm check:lean-v2` and `pnpm verify:lean-v2` commands.
- Added `@supabase/ssr` browser/server clients, cookie refresh in the Next.js 16 Proxy, trusted Admin authorization through `current_active_profile()`, and a password login route with invalid-credential/server-error/untrusted-profile states.
- Added protected localized Admin routes for Overview, Products, Brands, Categories, Option Library, Inventory, Orders, Media, Users, and Settings.
- Switched Refine to the Supabase data provider when configured and retained the explicit fail-fast fallback when configuration is absent.
- Replaced financial dashboard and order fixture fields with operational-only metrics and fulfillment identity/status fields.
- Added a live execution plan, TODO tracker, Local Supabase setup guide, Supabase SSR research notes, a CI workflow, and archived the stale V1 feature map.
- Removed committed debug/build logs and the obsolete single-console demo implementation.
- Upgraded the development environment to Node 24.19.0 with pnpm 10.4.1, installed Docker Engine 29.7.2 and Compose 5.5.0, and added a TDD-tested inventory adjustment adapter for the Lean `apply_inventory_adjustment` RPC.

## Validation

- `pnpm ci:check` — passed.
- `pnpm type-check` — passed.
- `pnpm check:deprecated` — passed with no deprecated API usage.
- `pnpm check:lean-v2` — passed: 13 migrations, 19 functions, 17 triggers, Orders-only Realtime.
- `pnpm test` — passed: 25 files, 124 tests, including the inventory RPC adapter test.
- `pnpm build` — passed; Next.js generated all protected Admin and login routes.
- Dev-server route smoke check — public login and protected Admin requests respond through the locale proxy.
- `pnpm verify:lean-v2` — Supabase CLI 2.115.0 resolves, but startup is blocked by the sandbox kernel: Docker bridge networking cannot access iptables raw/nftables support, and rootless slirp4netns cannot create a TUN device.

## Review notes

The database runtime gate remains open until this branch is verified on a Docker host with normal bridge networking through two clean reset/lint/pgTAP cycles, Local Auth bootstrap, and authenticated browser smoke tests. Docker is installed here, but the sandbox kernel prevents the required bridge networking. Cloudinary upload/deletion runtime checks also require server-side Cloudinary configuration. The application checks now run on Node 24.19.0; the remaining warning is the existing Vite CommonJS/ESM configuration warning.

No pricing, currency, revenue, tax, payment, or financial KPI fields are present in the active Admin routes, feature fixtures, or operational dashboard.
