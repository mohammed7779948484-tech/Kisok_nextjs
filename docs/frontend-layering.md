# Frontend layering for Kisok Admin

## Non-negotiable boundary

Presentation components do **not** import Supabase, invoke database clients, or contain query logic. A Feature component consumes a hook or a repository data contract; it does not decide how records are fetched or persisted. This boundary is enforced today — every Feature panel goes through `../repositories`, and `src/infrastructure/supabase/supabase-boundary.test.ts` asserts no Feature component imports `@supabase/supabase-js` directly.

## Current structure (hosted, not local/fixture)

```text
src/
  shared/
    ui/                      # Public UI facade: buttons, dialogs, status presentation
  features/<feature>/
    components/              # Rendering and event intent, calls a repository
    repositories/
      supabase.ts            # Hosted Supabase implementation of the feature's data contract
    server/                  # 'use server' actions for service-role-only operations
    types.ts                 # Feature entities and data contract
  infrastructure/supabase/
    client/                  # Browser/server/service-role client factories
    database.types.ts        # Generated Lean V2 Database type
    <domain>/adapter.ts       # Shared adapters used by more than one feature (inventory RPCs, dashboard projection)
```

There is no `data/` fixture layer — it was removed once hosted Supabase was wired up (see `src/infrastructure/refine/refine-runtime.test.ts` and `supabase-boundary.test.ts`, which assert the old local-access/placeholder-adapter files no longer exist). Every Feature's `repositories/supabase.ts` talks to the hosted project directly, or — where an operation needs the service-role key (Admin User search/mutation, Media Asset deletion) — delegates to a `'use server'` action that calls `getTrustedAdminSession()` first and only then uses `getServiceSupabaseClient()` (`src/infrastructure/supabase/client/service-client.ts`).

## Current state of Refine / TanStack

Refine (`@refinedev/core`, `@refinedev/nextjs-router`, `@refinedev/supabase`) is mounted in `src/providers/RefineProvider.tsx` with a real, live `supabaseDataProvider` against the hosted project — it is **not** a deferred/non-network provider. `src/infrastructure/refine/resources.ts` registers the Lean V2 tables as resources.

However, no Feature panel currently calls a Refine hook (`useList`, `useTable`, `useForm`, …), and neither `@tanstack/react-query` nor `@tanstack/react-table` nor `react-hook-form`/`zod` are used in any Feature component. Every panel instead does `useState` + `useEffect` + a `repositories/` call directly — Refine is mounted but decorative today, not load-bearing. This is tracked as an open architecture item, not a design decision: bringing simple, table-shaped CRUD (Brands, Categories, Option Types, Option Values, Media Assets list, Store Settings) onto `@refinedev/core` + `@refinedev/react-table` + `@refinedev/react-hook-form` would remove real duplicated `loading`/`error`/`data` state management (100+ call sites) without weakening any domain rule below.

**Never migrate these onto generic Refine CRUD** — they must stay custom domain mutations because the database enforces role/ledger/atomicity rules a generic `update`/`insert` would silently bypass:

- Inventory adjustments (`apply_inventory_adjustment`, `set_inventory_quantity` RPCs)
- Order status transitions (`update_order_status` RPC — role-scoped)
- Admin User search/mutation (`search_admin_profiles`, `admin_update_profile` — `service_role`-only; never route through the browser `supabaseDataProvider`)
- Cloudinary signing/deletion (server-only secrets)
- Variant Option replacement (diff-based; see `src/features/product-catalog/repositories/supabase.ts`)

`TanStack Query`/`Table` and `react-hook-form`/`zod` should be adopted feature-by-feature, alongside the Refine migration above, not as a separate effort — they compose with Refine's hooks (`@refinedev/react-table`, `@refinedev/react-hook-form`) rather than replacing them.
