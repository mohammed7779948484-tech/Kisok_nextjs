## Summary

This PR integrates the supplied Lean V2 database contract into `Kisok_nextjs` and establishes the first real Admin route foundation. It replaces the local/demo root mount with a localized, protected App Router Admin tree and removes the obsolete financial demo dashboard.

## Included

- Added the supplied 13 Lean V2 migrations, two pgTAP suites, deterministic `supabase/seed.sql`, static validator, Auth seed helper, and two-cycle local verification scripts.
- Initialized `supabase/config.toml` and added repeatable `pnpm check:lean-v2` and `pnpm verify:lean-v2` commands.
- Added `@supabase/ssr` browser/server clients, cookie refresh in the Next.js 16 Proxy, trusted Admin authorization through `current_active_profile()`, and a password login route with invalid-credential/server-error/untrusted-profile states.
- Added protected localized Admin routes for Overview, Products, Brands, Categories, Option Library, Inventory, Orders, Media, Users, and Settings.
- Switched Refine to the Supabase data provider when configured and retained the explicit fail-fast fallback when configuration is absent.
- Replaced financial dashboard and order fixture fields with operational-only metrics and fulfillment identity/status fields.
- Added a live execution plan, TODO tracker, Supabase SSR research notes, a CI workflow, and archived the stale V1 feature map.
- Removed committed debug/build logs and the obsolete single-console demo implementation.

## Validation

- `pnpm ci:check` — passed.
- `pnpm type-check` — passed.
- `pnpm check:deprecated` — passed with no deprecated API usage.
- `pnpm check:lean-v2` — passed: 13 migrations, 19 functions, 17 triggers, Orders-only Realtime.
- `pnpm test` — passed: 24 files, 123 tests.
- `pnpm build` — passed; Next.js generated all protected Admin and login routes.
- Dev-server route smoke check — public login and protected Admin requests respond through the locale proxy.
- `pnpm verify:lean-v2` — intentionally blocked at `supabase start` because this environment does not have Docker or Podman. The script resolved Supabase CLI 2.115.0 successfully.

## Review notes

The database runtime gate remains open until this branch is verified on a Docker-enabled machine with two clean reset/lint/pgTAP cycles, Local Auth bootstrap, and authenticated browser smoke tests. Cloudinary upload/deletion runtime checks also require server-side Cloudinary configuration. The repository requests Node >=24; this sandbox ran checks on Node 22 and emitted only the existing engine warning.

No pricing, currency, revenue, tax, payment, or financial KPI fields are present in the active Admin routes, feature fixtures, or operational dashboard.
