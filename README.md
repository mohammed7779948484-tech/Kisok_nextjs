# KISOK Admin

The Admin workspace for a single-store KISOK kiosk: catalog (Brands, Categories, Option Library, Products, Variants), Media, Inventory, Orders, Admin Users, and Store Settings — backed by a hosted Supabase project under the **Lean V2** database contract.

KISOK has **no pricing domain**: no price, cost, currency, tax, discount, payment, or revenue concept exists anywhere in this application, by design.

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **Styling**: Tailwind v4, shadcn/ui on Base UI primitives (`src/components/ui`), KISOK-specific wrappers in `src/shared/ui`
- **Data/CRUD orchestration**: Refine 5 (`@refinedev/core`, `@refinedev/supabase`, `@refinedev/nextjs-router`) for plain CRUD resources, backed by TanStack Query; domain RPCs (inventory, orders, admin users, Cloudinary) stay outside generic Refine CRUD — see [`docs/refine-integration-plan.md`](./docs/refine-integration-plan.md)
- **Forms**: React Hook Form + Zod (`@hookform/resolvers`)
- **Backend**: Supabase (Postgres + Auth + RLS) under the Lean V2 contract (`supabase/migrations/`)
- **Media**: Cloudinary for binaries, Supabase `media_assets` for metadata
- **State**: Redux Toolkit + redux-persist for genuinely client-only state (never for server/query data — that's Refine/TanStack Query's job)
- **i18n**: next-intl, all routes under `src/app/[locale]/`
- **Lint/format**: Biome only (no ESLint/Prettier)
- **Tests**: Vitest + React Testing Library

See [`AGENTS.md`](./AGENTS.md) for the full set of durable architecture and convention rules — read it before making structural changes.

## Directory map

```
src/
  app/[locale]/admin/     Protected Admin routes (catalog, products, inventory, orders, media, users, settings)
  app/[locale]/login/     Admin sign-in
  features/<feature>/     Feature-first modules: components/, hooks/, repositories/, schemas/, server/, types.ts
  infrastructure/
    supabase/             Typed browser/server/service-role Supabase clients, generated Database types
    refine/               Refine resource manifest
  providers/              RootProvider (Redux, theme, next-intl, Refine) — the only advertised mount point
  proxy.ts                Edge proxy (Next 16 replacement for middleware.ts) — Supabase session cookie refresh + i18n routing
  shared/ui/              KISOK-specific component wrappers over src/components/ui
supabase/
  migrations/             Lean V2 schema, RLS, grants, RPCs (numbered, append-only — never edit an applied migration)
  tests/                  pgTAP structural/behavioral suites
  seed.sql                Deterministic local-only dataset
docs/                     Architecture decisions, completion matrix, TDD log, setup guides
```

## Setup

```bash
pnpm install
cp .env.example .env   # fill in the values below
pnpm dev
```

### Environment variables

All env vars are validated through `@teispace/env` in `src/lib/env/index.ts` — never read `process.env.*` directly in application code.

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client | Supabase project URL (local or hosted) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client | Publishable/anon key — safe for the browser, subject to RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Bypasses RLS. Used only behind `getTrustedAdminSession()` guards for privileged Admin operations (Admin User management, Media deletion). Never sent to the browser. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | server-only | Media upload/delete signing. The API secret never leaves the server. |
| `DEFAULT_TIMEZONE`, `DEFAULT_LOCALE` | server | SSR formatting/i18n fallbacks |
| `NEXT_PUBLIC_APP_URL` | client | Canonical/OG URL base |

Terminal-only credentials (direct Postgres URL, pooler URL, legacy anon key for `psql`/scripting) do **not** belong in `.env` or the app's env schema — keep them in a separate untracked file (e.g. `.env.tools`) and source it explicitly when needed.

### Supabase (local)

See [`docs/LOCAL_SUPABASE_SETUP.md`](./docs/LOCAL_SUPABASE_SETUP.md) for the full local Supabase CLI workflow (`supabase start`, `db reset`, pgTAP). After a fresh `db reset`, run `pnpm seed:local-auth` to get working local login credentials — `supabase/seed.sql`'s seeded Auth rows have an intentionally unusable password hash and need this extra step (see the doc for why).

### Auth

Admin/Preparation sign-in goes through Supabase Auth → `current_active_profile()` (an RLS-safe RPC) resolves the caller's role and active state. The Next.js proxy (`src/proxy.ts`) refreshes the session cookie on every request. Bearer/localStorage token storage is used only in `development`/`test`; every deployed build uses HttpOnly cookies (`SAVE_AUTH_TOKENS` in `src/lib/config/constants.ts` is derived from `NODE_ENV`, never hardcoded).

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` / `pnpm lint:fix` / `pnpm format` | Biome |
| `pnpm ci:check` | Biome in CI mode (lint + format + import sort) |
| `pnpm type-check` | `tsc --noEmit` |
| `pnpm check:deprecated` | Fails on any `@deprecated` API usage |
| `pnpm check:lean-v2` | Static validator for the Lean V2 Supabase contract (no DB connection needed) |
| `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Vitest |
| `pnpm validate` | Full gate: `ci:check` → `type-check` → `check:deprecated` → `check:lean-v2` → `test` → `build` |
| `pnpm supabase:types` | Regenerate `src/infrastructure/supabase/database.types.ts` from the hosted schema |
| `pnpm verify:lean-v2` | Local Supabase: two clean `db reset` + lint + pgTAP cycles |
| `pnpm seed:local-auth` | Assign working passwords to the local seeded Auth users |
| `pnpm commit` | Guided Conventional Commits prompt |

## Development workflow

1. **TDD**: write a failing test first, confirm it fails for the right reason, implement the minimum correct behavior, confirm it passes, then refactor. See [`docs/KIOSK_ADMIN_TDD_EXECUTION_LOG.md`](./docs/KIOSK_ADMIN_TDD_EXECUTION_LOG.md) for the running record.
2. **Database changes**: add a new migration under `supabase/migrations/` (never edit an applied one), run `pnpm check:lean-v2`, and update `src/infrastructure/supabase/database.types.ts` via `pnpm supabase:types` once applied to the hosted project.
3. **New CRUD UI**: for a plain resource, follow the Refine + RHF/Zod reference pattern in `src/features/catalog-taxonomy/` (`hooks/useBrandsList.ts`, `hooks/useBrandForm.ts`, `components/BrandsPanel.tsx`) rather than hand-rolling `useState`/`useEffect` data-fetching. For a domain RPC (inventory, orders, admin users, Cloudinary, variant options), keep it a custom mutation — see `AGENTS.md`'s KISOK Admin domain rules for the exact boundary.
4. **Before pushing**: `pnpm validate` (the pre-push hook runs the fast subset automatically). Update `docs/KIOSK_ADMIN_COMPLETION_MATRIX.md` when a resource's CRUD surface changes.

## Project rules

Durable architecture, layering, and convention rules live in [`AGENTS.md`](./AGENTS.md) (Claude Code loads it via [`CLAUDE.md`](./CLAUDE.md)). Read it before making structural changes — it is the source of truth over any comment or prior PR description that might drift from it.
