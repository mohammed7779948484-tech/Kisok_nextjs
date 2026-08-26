# KISOK Admin V2 — Live TODO

## Completed

- Upgraded the development runtime to Node.js `v24.19.0` through the existing `.nvmrc`/nvm setup and activated pnpm `10.4.1` under Node 24.
- Installed Docker Engine `29.7.2`, Docker Compose `v5.5.0`, `slirp4netns`, `fuse-overlayfs`, `uidmap`, `kmod`, and `iproute2`; added the user to the `docker` group and verified Docker host-network containers.
- Resolved and downloaded Supabase CLI `2.115.0` through the repository’s `pnpm supabase` script.
- Added a TDD-tested Lean V2 inventory adjustment adapter that calls the transactional `apply_inventory_adjustment` RPC and validates its returned quantity/ledger ID.
- Fixed the Next.js 16 locale-routing regression by using always-prefixed locale URLs; `/en/login` no longer loops through `/login`, and SEO/sitemap URLs now use the same canonical policy.
- Connected to the provided hosted Supabase project through its pooler, applied all 13 Lean V2 migrations, and verified the supplied structural and behavioral pgTAP suites with no `not ok` results.
- Confirmed the hosted project has all 16 Lean application tables, `orders` as the only published application table in Realtime, and the Customer snapshot, checkout, and inventory adjustment RPCs.

- Recovered `mohammed7779948484-tech/Kisok_nextjs` from GitHub and verified `main` at `1c6538a`.
- Confirmed no previous-agent feature branch or feature PR contains unmerged work; only Dependabot PRs are open.
- Created `feat/lean-v2-admin-integration` from the current `main` HEAD.
- Read `AGENTS.md`, the supplied Lean V2 archive documentation, the shadcn design-system document, and the catalog UX notes.
- Classified the current Admin console as local/demo scaffold, Refine as deferred runtime, and Supabase adapters as placeholders.
- Confirmed the supplied Lean V2 archive contains 13 migrations, two pgTAP suites, 16 RLS tables, and the reduced operational RPC surface.
- Ran `pnpm install --frozen-lockfile`; dependency install completed with the repository’s Node engine warning because this environment runs Node 22 while the manifest requests Node 24 or newer.
- Ran `pnpm outdated`, relevant `pnpm why`, and a forced offline reinstall for dependency/peer visibility.
- Confirmed Docker is unavailable; the verification script resolves Supabase CLI 2.115.0 through the repository’s `pnpm supabase` command, but `supabase start` cannot run without Docker/Podman.
- Wrote `docs/KIOSK_ADMIN_LEAN_V2_EXECUTION_PLAN.md` with evidence-based phases 0–12.

## Remaining verification limits

- Docker-backed Local Supabase start/reset/lint/pgTAP execution remains blocked in this sandbox because the kernel lacks the bridge-network capabilities required by Supabase; hosted migration and pgTAP verification is complete and must not be conflated with local runtime acceptance.
- Authenticated browser login cannot be exercised without a configured test user and a reachable Auth runtime; unauthenticated localized route protection and login-page rendering were smoke-tested.
- Cloudinary upload/deletion cannot be exercised without user-provided server-side Cloudinary configuration; the secret remains server-only and the runtime check is documented.
- **(This session)** This sandbox's outbound egress proxy rejects the hosted Supabase host entirely — `curl https://lccplcswursecygwpltj.supabase.co/...` returns `403` on the HTTPS CONNECT, and `psql` against both the direct and pooler `DATABASE_URL`s hangs (raw TCP databases are unsupported by this proxy per its own status endpoint). This blocks the real `Admin@gmail.com` hosted login test, re-running the pgTAP suites, and independently confirming the RLS grants in `20260826050013_lean_rls_grants.sql` are applied as written on the live project, in this session. Eight critical correctness bugs were found and fixed this session using direct migration-SQL reading, unit/regression tests (RED against the pre-fix code, GREEN after), and the DB-connection-free `pnpm check:lean-v2` validator instead — see `docs/KIOSK_ADMIN_COMPLETION_MATRIX.md`'s "Critical correctness bugs" table and TDD log entry. Hosted/browser re-verification of these fixes is still required from a network-unblocked environment.

## Tests and checks

| Check | Status | Evidence |
| --- | --- | --- |
| GitHub recovery/ref audit | Passed | `git`/`gh` inspection on 2026-08-26 |
| Locked dependency install | Passed | `pnpm install --frozen-lockfile` under Node 24.19.0 and pnpm 10.4.1 |
| Dependency freshness audit | Completed | `pnpm outdated`, `pnpm why` |
| Lean V2 static validator | Passed | `pnpm check:lean-v2`; 13 migrations, 19 functions, 17 triggers; orders-only Realtime |
| Hosted DB migration/pgTAP | Passed | All 13 Lean V2 migrations applied to the provided Supabase project; structural suite 29/29 and behavioral suite 30/30 passed |
| Local DB reset/lint/pgTAP | Blocked by sandbox kernel | Local Docker bridge networking fails because the host kernel lacks iptables raw/nftables support; rootless slirp4netns cannot create a TUN device |
| Unit/component tests | Passed | `pnpm test`; 27 files, 126 tests, including TDD inventory, locale-routing, and SEO regression tests |
| Type-check/Biome/build | Passed under Node 24 | `pnpm ci:check`, `pnpm type-check`, `pnpm build`; Node 24.19.0 with pnpm 10.4.1 |
| Browser/server verification | Passed for unauthenticated flow | `/en/login` returned 200 with login content; `/en/admin` returned the login page without a redirect loop; `/login` safely redirects to `/en/login` |

## Architecture decisions

- Lean V2 is authoritative; V1/V2.2 RPC names and pricing concepts are not implemented.
- `src/components/ui` remains the official shadcn primitive source. `src/shared/ui` owns only recurring Kisok meaning.
- Refine remains headless and does not own the visual system.
- Server state belongs to Refine/TanStack Query, not Redux.
- Supabase session cookies own Auth state; Redux does not store Auth tokens.
- Cloudinary stores image binaries; `media_assets` stores canonical metadata and relationships.
- KISOK has no pricing, currency, revenue, tax, payment, or financial KPI domain.
