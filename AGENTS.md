<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Teispace Next.js Starter

Production-ready App Router template. Next 16, React 19, TypeScript, Tailwind v4, Biome, Redux Toolkit, next-intl.

## Stack decisions (don't fight these)

- **Linter/formatter**: Biome only. No ESLint, no Prettier. Config: `biome.json`. Run `pnpm lint` / `pnpm lint:fix` / `pnpm format`. CI uses `pnpm ci:check` (`biome ci`).
- **Tests**: Vitest + React Testing Library + jsdom. Co-locate as `*.test.tsx` next to the source file. Use `renderWithProviders` from `test/test-utils.tsx` when the component needs Redux/i18n. Run with `pnpm test` (or `pnpm test:watch` / `pnpm test:coverage`).
- **Env vars**: Always import from `@/lib/env` (validated + coerced at module load via `@teispace/env`, split server/client/shared with a client leak guard), never `process.env.NEXT_PUBLIC_*` directly. Add new vars in `src/lib/env/index.ts` — declare the coercer in the right group (`server` / `client` (must be `NEXT_PUBLIC_`-prefixed) / `shared`), add the key to `runtimeEnv`, AND `.env.example`. Reading a `server` var from a `'use client'` module throws by design.
- **Logging**: Import `logger` from `@/lib/logger` (pino) — never `console.*`. Attach context via `logger.child({ requestId, userId })`. Sensitive keys (token, password, authorization) are auto-redacted at the root, one level deep, and on common header locations (`req`/`res`/`response.headers`) — pino's `*` wildcard is not recursive, so keep log surfaces shallow (scalars, `{ err }`, explicit child bindings).
- **Routing interception**: `src/proxy.ts` (Next 16 replacement for `middleware.ts`). Do NOT create `middleware.ts`.
- **i18n**: `next-intl`. All user-facing routes live under `src/app/[locale]/`. Locale config in `src/i18n/routing.ts`; request config in `src/i18n/request.ts`. Locale types in `src/types/i18n.ts`.
- **State**: Redux Toolkit + redux-persist. Store assembled in `src/store/`. Use typed hooks from `src/store/hooks.ts`, never raw `useDispatch`/`useSelector`. The `ws` slice (`src/store/slices/ws.slice.ts`) is ephemeral — not persisted.
- **Theme**: `@teispace/next-themes` (drop-in replacement for the unmaintained `next-themes`). Provider in `src/providers/CustomThemeProvider.tsx`.
- **HTTP**: Dual clients (`fetchClient`, `axiosClient`) in `src/lib/utils/http/`. Universal entry is `@/lib/utils/http`; Server Components needing cookie forwarding import from `@/lib/utils/http/server`. Errors as typed `ApiException` from `src/lib/errors/` — clients never throw, returns land in `Either<ApiException, T>`. See `src/lib/utils/http/README.md`.
- **WebSocket**: Typed Socket.IO client in `src/lib/utils/ws/`. Import from `@/lib/utils/ws` only — `shared/`, `client/internals`, and `redux/bridge` are private. Browser-only; opening a socket from a Server Component throws. See `src/lib/utils/ws/README.md`.
- **Secure storage**: `react-secure-storage` wrapped in `src/services/storage/secure-storage.service.ts`. Never call the library directly.
- **Auth mode**: `SAVE_AUTH_TOKENS` (in `src/lib/config/constants.ts`) is derived from `NODE_ENV`, not hardcoded. Bearer/localStorage tokens are used ONLY in `development`/`test`; every deployed build (`next build` forces `NODE_ENV=production`, including staging) uses HttpOnly cookies. The token store is inert in cookie mode, and the secure-storage service throws if a write is attempted there. Cookie topology assumes frontend and API share a registrable domain (set the backend `COOKIE_DOMAIN=.example.com`, `SameSite=strict/lax`) — no CSRF token needed. A cross-site SPA/API split would instead require backend `COOKIE_SAMESITE=none` + credentialed CORS + CSRF protection.
- **Import alias**: `@/*` → `src/*`.

## Directory layout

```
src/
  app/              App Router (root-level pages: robots.ts, sitemap.ts, global-error.tsx, not-found.tsx)
  app/[locale]/     Localized routes (layout, page, error, not-found)
  components/       Shared, cross-feature components
  features/         Feature folders (components/, hooks/, store/, types/) — see features/README.md
  i18n/             next-intl config (routing, request, navigation, translations/)
  lib/
    config/         API base, app paths, locales, constants, SEO
    enums/          Cross-cutting enums (Environment, ...)
    env/            Zod-validated env schema + cached loader
    errors/         ApiException + catch helpers
    logger/         Pino logger + redaction constants
    utils/
      http/         Dual HTTP clients on a shared foundation (universal + server entries)
      ws/           Typed Socket.IO client + hooks + Redux bridge
    validations/    Reusable zod schemas
  providers/        RootProvider (the only advertised mount point) + Store/Theme providers
  proxy.ts          Edge proxy (Next 16 replacement for middleware.ts)
  services/storage/ react-secure-storage wrapper
  store/            Redux store, persistor, hooks, rootReducer, slices/, SSR-safe storage
  styles/           Global CSS
  types/            Shared TS types (common/, utility/, i18n)
```

## Conventions

- **Server by default**. Mark client components with `'use client'` only when needed (hooks, state, browser APIs).
- **Feature-first**. New domain logic goes in `src/features/<feature>/`, not scattered across `components/` + `store/`.
- **Types live with code**. Feature types in `features/<feature>/types/`; cross-cutting types in `src/types/`.
- **No comments explaining WHAT**. Code should read itself. Comments are reserved for non-obvious WHY.
- **Commit style**: Conventional Commits, enforced by commitlint. Use `pnpm commit` for a guided prompt.

## Quality gates

- `pnpm ci:check` — Biome lint + format + import sort (CI-optimized)
- `pnpm type-check` — `tsc --noEmit`
- `pnpm check:deprecated` — fails if any code uses an `@deprecated` API (uses the TS compiler API; catches what `tsc` hides at suggestion-level)
- `pnpm check:lean-v2` — static validator for the Lean V2 Supabase contract (migration count, function/trigger budgets, forbidden legacy tokens, RLS/grant shape, pgTAP plan counts). No DB connection required. Run this after touching anything under `supabase/`.
- `pnpm test` — Vitest run (CI uses this too)
- `pnpm validate` — full pipeline (`ci:check` → `type-check` → `check:deprecated` → `check:lean-v2` → `test` → `build`)
- `pnpm build` — production build
- `pnpm analyze` — bundle analyzer (ANALYZE=true)
- `pnpm seed:local-auth` — assigns working passwords to the local-only Auth users `supabase/seed.sql` creates (see `docs/LOCAL_SUPABASE_SETUP.md`)
- Husky hooks: `pre-commit` runs `env:sync` + lint-staged + type-check; `pre-push` runs `ci:check` + `type-check` + `check:deprecated` + `test` (build is left to CI); `commit-msg` runs commitlint.

## Adding a dependency

Check it's actually needed — this starter intentionally keeps the dep list tight. Prefer native Web/Node/Next APIs. When you do add one, justify it in the PR description.

## KISOK Admin domain rules

This repository is the KISOK Admin workspace built on this starter, integrated against a Supabase project under the **Lean V2** contract (`supabase/migrations/`). These rules are durable — they describe the actual current architecture and its boundaries, not a specific PR's progress.

- **The database is the authority.** `supabase/migrations/*.sql` define the Lean V2 contract: RLS policies, column-level grants, and RPC signatures are the source of truth for what's allowed, not the application code. If application code and a migration disagree, the migration is right until a reviewed migration changes it — never "fix" a UI bug by loosening a grant or an RLS policy. Never edit an already-applied migration file in place; add a new one.
- **No pricing domain, ever.** KISOK Admin has no price, cost, currency, subtotal, tax, discount, payment, revenue, profit, or checkout-amount concept anywhere. Orders are operational fulfillment records, not payment records. Reject any addition that reintroduces one, including from starter/template carryover code.
- **Refine is the preferred orchestration layer for plain CRUD/query resources.** `@refinedev/core`'s `useList`/`useCreate`/`useUpdate`/`useOne`/`useSelect` (+ `@refinedev/react-table`/`@refinedev/react-hook-form` where a table or form needs one) own list/read/simple-write lifecycle for resources like Brands, Categories, Option Types/Values, Store Settings, and Media Assets' read path — see `src/features/catalog-taxonomy/hooks/useBrandsList.ts` / `useBrandForm.ts` / `components/BrandsPanel.tsx` as the reference implementation, and `docs/refine-integration-plan.md` for the full migration status and priority order. Do not hand-roll `useState`/`useEffect` list-fetch/loading/error state for a resource Refine can already own.
- **Domain RPCs stay outside generic Refine/TanStack CRUD, always.** Inventory mutations (`apply_inventory_adjustment`, `set_inventory_quantity`), Order status transitions (`update_order_status` — role-scoped: Preparation owns `new→preparing`/`preparing→ready`, Admin owns `ready→completed`), Admin User search/mutation (`search_admin_profiles`/`admin_update_profile` — `service_role`-only), Cloudinary signing/deletion (server-only secrets), and Variant Option replacement (a client-orchestrated compensating rollback in `src/features/product-catalog/repositories/supabase.ts` — see its inline comments) all encode invariants a generic `.update()`/`.insert()` would silently bypass. Refine/TanStack may orchestrate the surrounding query cache and UI lifecycle around these, but the mutation itself must go through the domain RPC or trusted server action.
- **Forms use React Hook Form + Zod.** New create/edit forms should follow `src/features/catalog-taxonomy/schemas/brand.schema.ts` + `hooks/useBrandForm.ts`: a Zod schema (field names matching the target resource's own DB columns when the form submits through Refine's data provider directly), `@hookform/resolvers`'s `zodResolver`, and `@refinedev/react-hook-form`'s `useForm` for Refine-backed resources. Map DB constraint/RPC error responses to a visible form error rather than a silent failure.
- **Privileged Admin operations are server/service-role only.** Anything using `getServiceSupabaseClient()` (`src/infrastructure/supabase/client/service-client.ts`) or the Supabase Auth Admin API must live behind a `'use server'` action that first calls `getTrustedAdminSession()`. Never construct a service-role client in a browser-executable module — `src/infrastructure/supabase/supabase-boundary.test.ts` enforces that presentation components never import Supabase directly at all.
- **Cloudinary holds binaries, Supabase holds metadata.** `media_assets` stores `public_id`/`secure_url`/`asset_id`/dimensions/`created_by`, never the binary. Signing a Cloudinary upload/delete request happens server-side (the API secret never reaches the browser); registering the resulting metadata row can go through the authenticated browser client where Lean V2 grants allow it (see the `media_assets` grants in `20260826050013_lean_rls_grants.sql`). "Remove from Variant" (detach a `product_variant_media` relation) and "Delete Media Asset" (destroy the Cloudinary binary + metadata row, usage-guarded) are different operations — never conflate them in UI copy or code.
- **shadcn/Base UI primitives are reused, not reinvented.** `src/components/ui/*` is the canonical primitive source (Button, Input, Select, Checkbox, Dialog, Table, Pagination, Label, …); `src/shared/ui` holds only genuinely KISOK-specific wrappers (`KisokButton`, `KisokDialog*`, `KisokInput`, `StatusPill`). Never write a raw `<select>`/`<input type="checkbox">`/handwritten `<table>` where an equivalent primitive already exists.
- **TDD is the required workflow for behavioral changes**: write the failing test first, confirm it fails for the intended reason, implement the minimum correct behavior, confirm it passes, then refactor with tests green throughout. See `docs/KIOSK_ADMIN_TDD_EXECUTION_LOG.md` for the running record of RED→GREEN evidence.
- **Browser acceptance is required before a user-facing flow counts as complete** — a passing unit/component test proves the code behaves correctly against its mocks, not that the real hosted flow works. See `docs/KIOSK_ADMIN_COMPLETION_MATRIX.md` for what's been verified at each level (unit / hosted / browser) and its evidence.
