# Refine integration status for Kisok Admin

This document originally described a *plan* for a future Supabase/Refine activation. That activation has happened — the hosted Supabase project has been live since `3af2c3d` (`feat(db): validate lean v2 against hosted supabase`) and every Feature's `repositories/supabase.ts` (or `server/` action) talks to it directly. This document now records what is actually wired up versus what remains, so it stops contradicting the code. For architecture rules (layering, which operations must stay outside Refine), see `docs/frontend-layering.md`.

## What's live today

| Layer | Current state |
| --- | --- |
| `src/providers/RefineProvider.tsx` | Mounts `<Refine>` with a real `supabaseDataProvider(supabaseClient)` against the hosted browser client — not a deferred/non-network provider. No `authProvider`, no `accessControlProvider`, no `liveProvider`. |
| `src/infrastructure/refine/resources.ts` | Registers the actual Lean V2 table names (`brands`, `categories`, `option_types`, `option_values`, `products`, `product_categories`, `product_variants`, `variant_option_values`, `product_variant_media`, `media_assets`, `inventory`, `inventory_adjustments`, `orders`, `order_items`, `profiles`) — not the placeholder names (`operators`, `catalog-taxonomy`, …) an earlier draft of this plan used. Every entry defines only a `list` route; no resource defines `create`/`edit`/`show` actions yet. |
| `src/infrastructure/supabase/<feature>/` and `src/features/<feature>/repositories/supabase.ts` | Live. There is no `deferred-data-provider.ts` — it was deleted once the hosted provider replaced it (`src/infrastructure/refine/refine-runtime.test.ts` asserts it stays absent). |
| `@refinedev/core`, `@refinedev/nextjs-router`, `@refinedev/supabase` | Installed and mounted, but **no Feature component calls a Refine hook** (`useList`, `useTable`, `useForm`, …) — every panel uses `useState`/`useEffect` against a repository instead. Decorative, not load-bearing, today. |
| `@refinedev/react-table`, `@tanstack/react-table`, `@refinedev/react-hook-form`, `react-hook-form`, `zod` | Installed. Zero imports anywhere under `src/features` or `src/app`. |

## Remaining work, in priority order

1. **Migrate simple table-shaped CRUD onto real Refine hooks** — Brands, Categories, Option Types, Option Values, Media Assets list, Store Settings (singleton). These map cleanly onto `useList`/`useCreate`/`useUpdate`/`useSelect` + `@refinedev/react-table` for list state (sorting/filtering/pagination) and `@refinedev/react-hook-form` + the existing (currently unused) `store-settings.schema.ts` Zod schema for forms. This removes real duplicated `loading`/`error`/`data` `useState` triads (100+ call sites across 9 panels).
2. **Decide the `profiles` Refine resource's fate.** It is registered like any other resource but has no real data-provider-backed CRUD path (RLS grants nothing to `authenticated` on `profiles`; Admin User search/mutation go through `service_role`-only server actions). Either remove it from `refineResources` or gate it behind an `accessControlProvider` once one exists — do not leave it indistinguishable from a normal browser-CRUD resource.
3. **Add `authProvider`/`accessControlProvider`** only if they add real value (identity display, `CanAccess`/`useCan`, logout wiring) — Next.js server-side route protection (`current_active_profile()` via `getTrustedAdminSession()`) remains the authoritative gate regardless; Refine's version must never weaken it.
4. **`create`/`edit`/`show` resource actions and routes** for the resources migrated in (1), once their forms exist.

## What must never move onto generic Refine/TanStack CRUD

These have DB-enforced role/ledger/atomicity rules a generic `update`/`insert` would silently bypass — keep them as custom domain mutations, with Refine (if adopted) only orchestrating the surrounding query cache/UI lifecycle:

- Inventory adjustments (`apply_inventory_adjustment`, `set_inventory_quantity` RPCs)
- Order status transitions (`update_order_status` RPC — role-scoped: Preparation owns `new→preparing`/`preparing→ready`, Admin owns `ready→completed`)
- Admin User search/mutation (`search_admin_profiles`, `admin_update_profile` — `service_role`-only)
- Cloudinary signing/deletion (server-only secrets)
- Variant Option replacement (diff-based mutation; see `src/features/product-catalog/repositories/supabase.ts`)

## shadcn component policy

Unchanged from the original plan: `src/components/ui` is the official shadcn/Base UI primitive source; `src/shared/ui` holds only Kisok-specific wrappers. Refine's own shadcn registry (Radix-oriented) is not bulk-applied — it would conflict with the Base UI primitives already in place.
