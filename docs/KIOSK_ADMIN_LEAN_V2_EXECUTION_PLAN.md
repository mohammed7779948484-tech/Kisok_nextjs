# KISOK Admin V2 — Lean V2 Execution Plan

**Status:** Active implementation plan for `feat/lean-v2-admin-integration`.

**Authority:** The supplied `KIOSK_V2_LEAN_MIGRATIONS.zip` is the database source of truth. The supplied Kisok shadcn document governs interface layering, and `AGENTS.md` governs repository conventions. KISOK has no pricing or currency domain.

## Recovered baseline

The continuation base is `main` at `1c6538a` (`chore: record GitHub sync`). GitHub inspection found no previous-agent feature branch or open feature PR; only Dependabot pull requests are open. The recovered application is a next-maker/Teispace Next.js 16 baseline with React 19, TypeScript 6, Tailwind 4, Biome, Vitest, next-intl, Redux Toolkit, Refine 5, and Supabase JS. The current Admin experience is a single client-side `KisokAdminConsole` with local state navigation and fixture repositories. Refine is mounted with a deliberate fail-fast deferred provider. Supabase browser/server clients and all feature adapters are placeholders. The repository has no active `supabase/` directory, and the current environment does not provide Docker or the Supabase CLI, so the database runtime gate must remain explicitly unverified until it is run on a Docker-enabled developer machine.

## Phase 0 — Recovery, architecture, security, and design audit

**Inputs:** GitHub repository, `AGENTS.md`, package manifest, source tree, design-system document, UX notes, Lean V2 archive, and current GitHub refs.

**Likely files:** `AGENTS.md`, `package.json`, `src/app/**`, `src/features/**`, `src/infrastructure/**`, `src/components/ui/**`, `src/shared/ui/**`, `src/styles/globals.css`, existing docs, `.env.example`, `.github/**`.

**Acceptance criteria:** The working tree is verified, implementation occurs on the dedicated branch, the baseline is classified as foundation/shared/feature/demo/obsolete/deferred, stale V1 assumptions are isolated from active work, and no secret-bearing values are copied or exposed.

**Tests/checks:** Git remote/ref audit, `git status`, tracked secret-name audit, repository-wide no-pricing/obsolete identifier audit, `pnpm outdated`, relevant `pnpm why`, and baseline quality commands.

**Dependency:** None. This phase is complete enough to begin the integration when the plan is reviewed against actual findings.

## Phase 1 — Local Supabase project and Lean V2 database

**Inputs:** The 13 migrations, two pgTAP suites, local verification scripts, and migration manifest from the archive.

**Likely files:** `supabase/config.toml`, `supabase/migrations/**`, `supabase/tests/**`, `supabase/seed.sql`, `scripts/**`, `package.json`, database documentation.

**Acceptance criteria:** Only Lean V2 migrations are active; the local project starts, resets cleanly from zero, passes static validation, passes DB lint with failure-on-error, and passes both supplied pgTAP suites twice. The deterministic local seed contains representative Brands, two-level Categories, global Option Types/Values, Products and Variants, media links, normal/low inventory, operational Orders, and ledger history without prices, currency, or revenue.

**Tests/checks:** `supabase start`, `supabase db reset --local`, static validator, `supabase db lint --local --level error --fail-on error`, `supabase test db --local`, repeated after a second reset.

**Dependency:** Phase 0. Runtime execution is currently blocked by missing Docker/Supabase CLI in this environment and must be run elsewhere before claiming runtime acceptance.

## Phase 2 — SSR Auth, Admin authorization, and route shell

**Inputs:** Lean trusted-profile contract, Supabase SSR guidance, Next.js 16 cookies/proxy guidance, and current next-intl routing.

**Likely files:** `src/infrastructure/supabase/client/**`, `src/infrastructure/supabase/auth/**`, `src/proxy.ts`, `src/app/[locale]/admin/**`, login route, `src/lib/env/index.ts`, providers.

**Acceptance criteria:** Email/password login, logout, invalid-credential and server-error states, cookie session refresh, trusted `profiles` verification through `current_active_profile()`, protected Admin layout, and no public registration. Service-role operations stay server-only.

**Tests/checks:** Unit tests for login/error mapping and authorization decisions; route tests for protected redirects and logout; browser smoke tests when local Supabase is available.

**Dependency:** Phase 1 local schema and local Auth bootstrap.

## Phase 3 — Kisok design-system alignment

**Inputs:** Supplied four-layer shadcn design-system document and existing Base Nova primitives.

**Likely files:** `src/styles/globals.css`, `src/components/ui/**`, `src/shared/ui/**`, feature composition files.

**Acceptance criteria:** Semantic tokens own recurring decisions, official shadcn primitives remain the primitive source, recurring visual roles use variants, shared UI contains Kisok meaning rather than duplicate primitives, and feature components contain composition only.

**Tests/checks:** Primitive/shared boundary tests, accessibility checks, Biome, TypeScript, and rendered checks at narrow/intermediate/wide widths.

**Dependency:** Phase 0; route shell from Phase 2 is the first consumer.

## Phase 4 — Brands, Categories, and Option Library

**Inputs:** Lean direct CRUD tables and two-level/reorder constraints.

**Likely files:** `src/features/catalog-taxonomy/**`, `src/infrastructure/supabase/catalog-taxonomy/**`, Refine resources/hooks, localized admin routes.

**Acceptance criteria:** Brands support list/search/create/edit/active state/reorder and optional media; Categories enforce a maximum of two levels with scoped reorder; Option Types and Values support reusable CRUD/active state and dependent selection. Product category relations do not invent primary-category or per-category ranking fields.

**Tests/checks:** Feature repository tests, schema/error mapping tests, duplicate/depth/reorder coverage, keyboard and empty/loading/error UI checks.

**Dependency:** Phases 1–3.

## Phase 5 — Products, Variants, Option relations, and media links

**Inputs:** Lean product/variant schema and direct CRUD grants.

**Likely files:** `src/features/product-catalog/**`, product routes/forms, generated types, repositories/hooks.

**Acceptance criteria:** Product form supports optional Brand, one or more leaf Categories, one internal Variant for simple Products, multiple Variants, generated SKU visibility, optional Barcode, low-stock threshold, reusable Option Values with duplicate-combination prevention, title override only when supported, and Variant/Product media relations. No pricing fields are present in UI, types, validation, fixtures, tests, or translations.

**Tests/checks:** Product editor/unit tests, Zod validation tests, duplicate option combination tests, direct CRUD integration tests against local Supabase, and browser form flows.

**Dependency:** Phases 1–4.

## Phase 6 — Media Library and Cloudinary boundary

**Inputs:** Lean `media_assets`, usage RPC, Cloudinary response contract, and environment policy.

**Likely files:** `src/features/media-library/**`, `src/infrastructure/cloudinary/**`, server upload route, media picker, env schema, docs.

**Acceptance criteria:** Server-side upload/signing keeps the Cloudinary secret off the browser; verified response metadata registers one canonical `media_assets` row; assets are reusable; unlinking differs from deletion; usage is checked before physical deletion; partial failures are recoverable and visible.

**Tests/checks:** Response validation, registration/reuse tests, usage guard tests, partial-failure tests, and browser picker state reset checks.

**Dependency:** Phases 1–3; product/media links from Phase 5 may consume the boundary.

## Phase 7 — Inventory operations

**Inputs:** Lean `apply_inventory_adjustment`, `set_inventory_quantity`, Inventory tables, and ledger constraints.

**Likely files:** `src/features/inventory/**`, inventory repository/adapter, operational routes and forms.

**Acceptance criteria:** Quantity changes use only the transactional RPCs, require appropriate reasons, display the verified ledger-backed result, and never expose financial value or cost concepts.

**Tests/checks:** Adjustment direction/reason validation, set-quantity, low-stock presentation, ledger verification, rejected mutation cases, and browser smoke tests.

**Dependency:** Phases 1–5.

## Phase 8 — Orders and fulfillment workflow

**Inputs:** Lean operational Orders schema and `update_order_status` RPC.

**Likely files:** `src/features/orders/**`, order repository/adapter, orders route, status UI.

**Acceptance criteria:** Orders render operational fields only, support allowed Admin transitions including ready-to-completed and cancellation, map rejected transitions clearly, and never display totals, payment, prices, or currency.

**Tests/checks:** Allowed/rejected transition tests, cancellation restoration behavior, status filters, empty/error states, and browser workflow checks.

**Dependency:** Phases 1–3 and Phase 7 for inventory restoration visibility.

## Phase 9 — Admin Users and Store Settings

**Inputs:** Service-role-only profile functions, last-admin/self-demotion invariant, and Lean settings fields.

**Likely files:** `src/features/admin-users/**`, server-only Admin User route handlers, `src/features/store-settings/**`, env/docs.

**Acceptance criteria:** Admin Users operations are server-only, protect the last active Admin and self-demotion, and support the allowed role/status/profile workflows. Store Settings uses only Lean fields and selects its logo from Media Library without inventing financial settings.

**Tests/checks:** Server-boundary tests, last-admin/self-demotion tests, settings schema tests, and browser form checks.

**Dependency:** Phases 1–3 and Phase 6 for logo selection.

## Phase 10 — Operational Dashboard

**Inputs:** Real operational tables/queries and the existing dashboard model after removal of fake financial metrics.

**Likely files:** `src/features/dashboard-operations/**`, dashboard route, query/repository adapters, translations.

**Acceptance criteria:** Dashboard uses real operational metrics such as Products, active Products, Variants, unavailable Variants, low stock, open Orders, statuses, recent Orders, adjustments, Brands, Categories, and Media. No financial KPI or amount appears.

**Tests/checks:** Metric projection tests, loading/empty/error states, query-key/invalidation tests, and browser checks.

**Dependency:** Phases 4–9.

## Phase 11 — UX polish, accessibility, and React performance review

**Inputs:** All implemented routes and the supplied design/UX rules.

**Likely files:** All Admin route and feature UI files, translations, shared components, CSS tokens.

**Acceptance criteria:** Loading/empty/error/success/unavailable states are designed; keyboard focus and dialog behavior are verified; responsive behavior is checked at three widths; no direct Supabase imports exist in presentation; expensive tables and unnecessary client boundaries are addressed.

**Tests/checks:** `pnpm ci:check`, `pnpm type-check`, `pnpm check:deprecated`, `pnpm test`, `pnpm build`, browser smoke/a11y review, and React best-practices review.

**Dependency:** Phases 2–10.

## Phase 12 — CI, clean verification, documentation, and Pull Request

**Inputs:** Green application tests, local DB evidence from a Docker-enabled environment, and current GitHub workflow configuration.

**Likely files:** `.github/workflows/**`, README, TODO, docs, package scripts, PR metadata.

**Acceptance criteria:** CI runs frozen install, Biome, type-check, deprecated API check, tests, and production build without production Supabase access. Two clean local DB reset cycles, Auth bootstrap, application startup, browser smoke tests, final security review, and no-pricing audit are documented. The dedicated branch is pushed and a reviewable PR into `main` is opened.

**Tests/checks:** Full `pnpm validate`, clean local Supabase verification twice, browser coverage, Supabase advisor review where supported, secret audit, obsolete API audit, and no-pricing audit.

**Dependency:** All preceding phases. Docker/Supabase runtime verification is an explicit external blocker in the current environment.

## Architecture decisions

The Admin uses App Router routes under `[locale]/admin`, an authenticated server layout, official shadcn primitives, Refine 5 for headless CRUD/data orchestration, TanStack Query/Table v8 through existing adapters, and feature repositories that isolate Supabase from presentation. Supabase sessions remain in SSR-managed cookies rather than Redux. Cloudinary owns image binaries while `media_assets` owns canonical metadata. The current giant local console is treated as demo/scaffold code and is not the target route architecture. V1/V2.2 contracts remain historical reference only and must not be reintroduced.
