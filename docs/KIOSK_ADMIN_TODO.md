# KISOK Admin V2 — Live TODO

## Completed

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

## In progress

- Add Lean V2 migrations/tests/scripts without mixing legacy migration sets.
- Replace the deferred Supabase boundaries with typed SSR/browser clients and local-runtime configuration.
- Add real Admin login, trusted-profile authorization, protected App Router routes, and logout.
- Replace pricing/revenue demo content with operational-only Admin surfaces.
- Wire Refine to the Supabase adapter while keeping feature presentation free of Supabase imports.
- Add focused tests before each production behavior change.

## Blocked or not yet verified

- Docker-backed Local Supabase start/reset/lint/pgTAP execution is blocked in this environment because Docker and the Supabase CLI are unavailable. Do not claim DB runtime acceptance until the supplied verification scripts pass on a Docker-enabled developer machine.
- Local Auth bootstrap and browser login cannot be truthfully exercised until Local Supabase is running.
- Cloudinary upload/deletion cannot be exercised without user-provided server-side Cloudinary configuration; implementation must keep the secret server-only and document the remaining runtime check.
- The repository requests Node >=24 while the current sandbox provides Node 22. Production CI/build verification may require the project’s configured Node 24 environment.

## Tests and checks

| Check | Status | Evidence |
| --- | --- | --- |
| GitHub recovery/ref audit | Passed | `git`/`gh` inspection on 2026-08-26 |
| Locked dependency install | Passed with engine warning | `pnpm install --frozen-lockfile` |
| Dependency freshness audit | Completed | `pnpm outdated`, `pnpm why` |
| Lean V2 static validator | Passed | `pnpm check:lean-v2`; 13 migrations, 19 functions, 17 triggers; orders-only Realtime |
| Local DB reset/lint/pgTAP | Blocked after CLI check | Supabase CLI 2.115.0 resolved through pnpm; `supabase start` stopped because Docker/Podman is not installed |
| Unit/component tests | Passed | `pnpm test`; 24 files, 123 tests |
| Type-check/Biome/build | Passed with Node warning | `pnpm type-check`, `pnpm ci:check`, `pnpm build`; Node 22 warns because project requests Node >=24 |
| Browser verification | Partial | Dev server smoke check passed for route responses; authenticated login workflow awaits Local Supabase/Auth runtime |

## Architecture decisions

- Lean V2 is authoritative; V1/V2.2 RPC names and pricing concepts are not implemented.
- `src/components/ui` remains the official shadcn primitive source. `src/shared/ui` owns only recurring Kisok meaning.
- Refine remains headless and does not own the visual system.
- Server state belongs to Refine/TanStack Query, not Redux.
- Supabase session cookies own Auth state; Redux does not store Auth tokens.
- Cloudinary stores image binaries; `media_assets` stores canonical metadata and relationships.
- KISOK has no pricing, currency, revenue, tax, payment, or financial KPI domain.
