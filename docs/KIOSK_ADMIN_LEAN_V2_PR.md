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
- Connected to the provided hosted Supabase project through its pooler, applied all 13 Lean V2 migrations, and kept the public client environment in ignored `.env.local` while server-only credentials remained outside the repository.
- Fixed the Next.js 16 locale-routing regression by adopting always-prefixed locale URLs; aligned sitemap and SEO canonical generation with the same policy and added focused regression tests.

## Validation

- `pnpm ci:check` — passed.
- `pnpm type-check` — passed.
- `pnpm check:deprecated` — passed with no deprecated API usage.
- `pnpm check:lean-v2` — passed: 13 migrations, 19 functions, 17 triggers, Orders-only Realtime.
- `pnpm test` — passed: 27 files, 126 tests, including the inventory RPC adapter plus locale-routing and SEO regression tests.
- `pnpm build` — passed; Next.js generated all protected Admin and login routes.
- Dev-server route smoke check — `/en/login` returned HTTP 200 with login content without a redirect loop; `/en/admin` returned the login page for the unauthenticated request; `/login` returned the expected 307 redirect to `/en/login`.
- Hosted pgTAP validation — passed after a collation/type-safe fix to the supplied Realtime assertion: structural suite 29/29 and behavioral suite 30/30, with no TAP `not ok` results. The behavioral suite runs inside a transaction and rolled back.
- `pnpm verify:lean-v2` — the hosted database gate passed through the direct pooler connection; the separate local Docker verification remains blocked by the sandbox kernel because Docker bridge networking cannot access iptables raw/nftables support, and rootless slirp4netns cannot create a TUN device.

## Review notes

The hosted database schema and supplied pgTAP contract are now verified. The separate local reset/lint workflow remains open until this branch is run on a Docker host with normal bridge networking through two clean reset/lint/pgTAP cycles, Local Auth bootstrap, and authenticated browser smoke tests. Docker is installed here, but the sandbox kernel prevents the required local bridge networking. Cloudinary upload/deletion runtime checks also require server-side Cloudinary configuration. Application checks run on Node 24.19.0; the remaining warning is the existing Vite CommonJS/ESM configuration warning. The current unauthenticated route smoke is complete; authenticated browser login still requires a configured test user and reachable Auth runtime.

No pricing, currency, revenue, tax, payment, or financial KPI fields are present in the active Admin routes, feature fixtures, or operational dashboard.
