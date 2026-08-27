# KISOK Admin V2 — Completion Matrix

**Audit baseline:** current HEAD on `feat/lean-v2-admin-integration` (post `aaa2bb6`, this consolidation/correctness repair round included — see the new section below. The `1e4c14a`-era content further down predates a large parallel "Product Editor Scoped Round" delivery (`ddadddf`) that substantially rewrote the Product editor and taxonomy UI after this matrix was first written; treat any statement below about Product-editor internals as historical unless corroborated by `docs/PR6_FINAL_EXECUTION_TODO.md`, which tracks the current state item-by-item).

**Authority:** Lean V2 migrations and the explicitly authorized hosted Supabase project. A route, configured data provider, fixture-backed component, or unit mock is not counted as completed CRUD. A repository/RPC method with no UI caller is marked "dead code", not "done".

## Critical correctness bugs — status

All eight items below were independently verified against the actual code at HEAD (not assumed from a prior report) before being fixed. Each has a regression test that fails against the pre-fix code.

| # | Bug | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Admin Users search called `search_admin_profiles` (a `service_role`-only RPC per `20260826050013_lean_rls_grants.sql`) from the browser Supabase client | **Fixed** | `src/features/admin-users/server/admin-user-search.ts` (new server-only operation, mirrors `admin-user-operation.ts`), repository now delegates via `searchAdminUsers` server action. Tests: `admin-user-search.test.ts`, `repositories/users.test.ts`. |
| 2 | Admin Orders UI offered `new→preparing`/`preparing→ready` — Preparation-only transitions per `update_order_status` — to the Admin actor | **Fixed** | `OrdersPanel.tsx`'s `nextStatusForAdmin` now only offers `ready→completed`. Test: `OrdersPanel.test.tsx` ("does not offer Preparation-only transitions..."). |
| 3 | Dashboard `openOrderCount` was derived from the same 5-row `recentOrders` slice, undercounting whenever more than 5 open orders exist | **Fixed** | Independent `count:'exact', head:true` query with `.not('status','in',...)`. Test: `dashboard.test.ts` ("counts every open order globally..."), 8 open orders / 5-row cap. |
| 4 | Product Catalog used a hardcoded `stock <= 5` cutoff instead of the effective per-variant/global threshold used by Inventory and Dashboard | **Fixed** | Extracted `resolveLowStockThreshold` to `src/lib/utils/inventory/low-stock-threshold.ts`; all three call sites now share it. Tests: `product.test.ts` (2 new cases proving variant-override and global-fallback behavior replace the old cutoff). |
| 5 | Variant Option replacement was DELETE-all-then-INSERT (non-transactional); a failed INSERT after a successful DELETE silently destroyed the prior combination | **Fixed** | Diff-based mutation (insert additions/update changes first, delete only explicitly-removed types last) in `product-catalog/repositories/supabase.ts`. Test: `variant-options.test.ts` ("never loses the prior combination when a mid-way write fails"). |
| 6 | Product creation used a manual client-side DELETE as compensation if the `product_categories` relation insert failed | **Verified, unchanged by design** | Lean V2 explicitly permits incomplete Products during editing. The existing compensation is simple, already tested, and does not introduce a giant transactional RPC — left as the deliberate strategy per the task's own guidance against over-engineering. Not re-litigated this session. |
| 7 | Media Asset delete-compensation (restore-on-Cloudinary-failure) dropped `asset_id` and `created_by` even though the query selected them | **Fixed** | `MediaAssetRecord` now carries `assetId`/`createdBy`; both `mapAsset` functions and the `restoreMetadata` insert include them. Test: `actions.restore-metadata.test.ts` (asserts the restore INSERT payload contains the original `asset_id`/`created_by`). |
| 8a | Seed Auth users had `encrypted_password = ''`; documented local credentials didn't match any seeded account | **Documented + tooling gap closed** | Seed comment now explains the empty hash is FK-only. Added `scripts/seed-local-auth.sh` (bash port of the existing `.ps1`, previously Windows-only) and documented local credentials in `docs/LOCAL_SUPABASE_SETUP.md`. Cannot be executed end-to-end in this sandbox (local Docker/Supabase start is blocked here — pre-existing, documented sandbox limitation, unrelated to this fix). |
| 8b | Seed `orders.display_number` values (`KSK001`…`KSK005`) violated the `^[A-HJ-NP-Z2-9]{6}$` CHECK (contain `0`/`1`) | **Fixed** | Replaced with `KS2AB2`…`KS2AB6`. Regression test: `test/seed-coherence.test.ts` (fails against the pre-fix seed). |
| 8c | Seed `inventory.current_quantity` disagreed with the sum of that variant's `inventory_adjustments` ledger rows for 2 of 4 variants | **Fixed** | Moved the direct `UPDATE ... CASE` to run after every ledger row and recomputed it as the true cumulative sum (7/19/1/4, was 6/19/1/5). Regression test: `test/seed-coherence.test.ts` (fails against the pre-fix seed). |

## Continuation-session correctness fixes (A1–A4)

| # | Bug | Status | Evidence |
| --- | --- | --- | --- |
| A1 | Auth bootstrap silently reused a stale/unusable password hash for an already-existing local Auth user instead of resetting it | **Fixed** | `scripts/lib/local-auth-seed.ts`'s `seedLocalAuthUser` now always calls `PUT /auth/v1/admin/users/{id}` when the user exists. RED: `local-auth-seed.test.ts` "resets the password..." failed (0 PUT calls) pre-fix. Replaced the platform-specific `.sh`/`.ps1` scripts with one cross-platform `scripts/seed-local-auth.ts`. |
| A2 | Product Catalog stock aggregation counted inactive Variants' stock, disagreeing with Dashboard (which already excludes them) | **Fixed** | `listProducts()` now filters to `activeVariants` before aggregating `availableStock`/low-stock/`variantCount`. RED: 3/4 new `product.test.ts` cases failed pre-fix. |
| A3 | Variant Option replacement (already diff-based per bug #5) had no rollback for a later-stage (update/delete) write failure — only the first-insert-fails case was covered | **Fixed** | Client-orchestrated compensating-rollback (saga): every successful insert/update/delete step is tracked and reversed in order on any later failure; a rollback failure combines both errors into one message rather than swallowing either. A real `security invoker` RPC would be strictly stronger but was judged too risky to ship unverified against the network-blocked hosted DB and the static validator's frozen 13-migration/final-grants-file invariants — recorded as a follow-up. RED: 3 new later-stage-failure cases in `variant-options.test.ts` failed pre-fix (8 tests total after). |
| A4 | Media delete-compensation restore lost `updated_at` (fell back to the restore-time default) and silently dropped the original Cloudinary-failure context on a dual failure (Cloudinary delete fails AND DB restore also fails) | **Fixed** | Added `updatedAt` to `MediaAssetRecord` end-to-end; `delete-media.ts` now catches a restore failure and throws one combined error naming both failures plus "requires manual reconciliation". RED: restore-metadata test failed on missing `updated_at`; new dual-failure test failed (got only the restore error) pre-fix. |

## Feature acceptance matrix

| Resource | Read | Search | Filter | Sort | Pagination | Create | Update | Deactivate | Delete | Reorder | Relations | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Brands | ✅ Refine `useList` | ✅ debounced | ❌ | ✅ `display_order` | ✅ Refine server pagination | ✅ Refine `useForm`+Zod | ✅ Refine `useForm`+Zod | ✅ `useUpdate` | ❌ (matches Lean V2: no delete UI anywhere in catalog masters) | ⚠️ repo method (`reorderBrands`), no UI | ⚠️ partial (still selected by name in Product editor, no FK reassignment tooling) | ✅ |
| Categories | ✅ Refine `useList` | ✅ debounced | ✅ `parent_id` scope (root/child) | ❌ | ✅ Refine server pagination | ✅ Refine `useForm`+Zod | ✅ Refine `useForm`+Zod (incl. reparent) | ✅ `useUpdate` | ❌ (`ON DELETE RESTRICT` on `parent_id`; no delete-blocked-by-references UI built) | ✅ `useCategoryReorder` + `reorder_items` RPC | ✅ two-level hierarchy shown | ✅ |
| Option Types | ✅ Refine `useList` | ✅ debounced | ❌ | ❌ | ✅ Refine server pagination | ✅ Refine `useForm`+Zod | ✅ Refine `useForm`+Zod | ✅ `useUpdate` | ❌ (`ON DELETE RESTRICT` on Values' `option_type_id`) | ✅ `useOptionTypeReorder` + `reorder_items` RPC | – | ✅ |
| Option Values | ✅ Refine `useList` (dependent, per selected Type, unpaginated) | ❌ (not needed at this scale) | ✅ scoped to selected Option Type | ❌ | – (unpaginated by design, single Type's Values) | ✅ Refine `useForm`+Zod | ✅ Refine `useForm`+Zod | ✅ `useUpdate` | ❌ | ✅ `useOptionValueReorder` + `reorder_items` RPC, scoped per Type | ✅ | ✅ |
| Products | ✅ (incl. corrected active-Variant-only stock status, A2) | ✅ client-side | ❌ | ❌ | ✅ client-side | ✅ `ProductFormDialog` (name/brand/categories/description/featured) | ✅ `ProductFormDialog` edit mode + `updateProduct` | ✅ activate/deactivate | ❌ | ❌ | ✅ Brand + Category reassignment after creation via `setProductCategories` | ✅ |
| Product Categories | ✅ `listProductCategoryIds` | – | – | – | – | ✅ (on Product create) | ✅ `setProductCategories` diff (add/remove) | – | ✅ (via diff) | – | ✅ | ✅ |
| Variants | ✅ | ❌ | ❌ | ❌ | ❌ (per-Product list, not paginated) | ✅ (DB-generated SKU) | ✅ `VariantFormDialog` (barcode/title_override/threshold/active); SKU read-only | ✅ activate/deactivate | ❌ | ❌ | ✅ | ✅ |
| Variant Options | ✅ `VariantOptionsDialog` (`listVariantOptionValues`) | – | – | – | – | ✅ staged combination → `replaceVariantOptionValues` | ✅ same call, diff+rollback (A3) | – | ✅ (via diff) | – | ✅ one Value per Type enforced client + server | ✅ |
| Variant Media | ✅ `VariantMediaPicker` | ❌ | – | ❌ | – | ✅ attach existing + upload-and-attach | ✅ reorder (`reorder_items`, `variant_media` scope) | – | ✅ "Remove from Variant" (`detachVariantMedia`, join-row only — never the asset) | ✅ | ✅ set-primary (two sequential UPDATEs around the partial unique index) | ✅ |
| Media Assets | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ upload UI: sign → Cloudinary POST → register (each stage gated on the previous) | ❌ | – | ✅ (usage-guarded, compensation complete incl. A4) | – | ✅ | ✅ |
| Inventory | ✅ | ❌ | ❌ | ❌ | ❌ | – | ✅ (adjust/set-qty RPCs) | – | – | – | ✅ | ✅ |
| Orders | ✅ | ❌ | ❌ | ❌ | ❌ | – | ✅ per-role via RPC (role-correct, see bug #2) | – | – | – | ✅ | ✅ |
| Admin Users | ✅ (server-boundary-correct, see bug #1) | ✅ single debounced pattern (redundant Search button removed) | ❌ | ❌ | ✅ wired to `totalCount` | ✅ `createAdminUser` (Auth user + profiles row, rollback on partial failure) | ✅ display name + role (`EditAdminUserDialog`) + password reset (`resetAdminUserPassword`) | ✅ | ❌ (DB enforces last-active-admin + self-demotion protection instead — not duplicated client-side) | – | – | ✅ |
| Store Settings | ✅ | – | – | – | – | – | ✅ (incl. logo picker) | – | – | – | ✅ | ✅ |
| Dashboard | ✅ (correct global counts, see bug #3) | – | – | – | – | – | – | – | – | – | ✅ | ✅ |
| Auth | ✅ login/protect/logout/refresh persistence | – | – | – | – | – | – | – | – | – | – | ✅ unit-level; real hosted login attempted via Playwright this session — reached the real Supabase Auth token endpoint and failed with the same `ERR_TUNNEL_CONNECTION_FAILED` egress denial documented below (proves the wiring is correct; hosted credential verification remains blocked) |

## Consolidation/correctness repair round (2026-08-27, post-`a704f57`)

This round's full item-by-item disposition lives in `docs/PR6_FINAL_EXECUTION_TODO.md` (FIX-08/09/13/19/24/25/29/37/38/40/41/42/46/47/48/49/50/55/56/57/58/59/60/61/82/83, plus a new Option Value hard-delete item). Summary:

- **One canonical Media Picker.** Brand, Category, and Store Settings logo pickers now all use the same `MediaPickerDialog` already shared by Product cover and Variant Media. The older, weaker `MediaAssetPickerDialog` (client-only substring search, no pagination, no camera) had no remaining consumers and was deleted.
- **Lean V2 semantic correctness fix.** `getProductVisibility()` previously required *every* active Variant to be individually eligible; it now matches `get_customer_catalog()`'s actual rule (visible with **at least one** eligible active Variant — a bad sibling only removes itself).
- **Unsaved-changes navigation guard.** New `src/shared/navigation/UnsavedChangesGuard.tsx` covers in-app Link navigation (admin sidebar, header, recovery links) while a Product editor is dirty, not just the pre-existing `beforeunload` handler and one dedicated "Back to Products" button.
- **N+1 fix.** Product editor Variant Media/Option reads are now one batched query per Product instead of one per Variant.
- **Store Settings** migrated from manual `useState`/`useEffect` (with a dead, mismatched Zod schema) to `react-hook-form` + a real Zod schema + TanStack Query + the shared Media Picker.
- **Auth/security:** sign-out now surfaces a *resolved* `{ error }` from Supabase (previously only a rejected promise was handled — a real gap, despite this being previously marked complete); per-route login redirect (`next` param now reflects the actually-requested path, not always `/admin`); an authenticated Admin visiting `/login` is redirected away; `proxy.ts`'s SSR cookie-refresh logic was re-verified correct and given a regression test it previously lacked.
- **Admin Users:** create-rollback now surfaces both failures when the compensating Auth-user delete itself also fails (previously silently dropped); Create/Edit forms migrated to RHF/Zod.
- **Catalog masters:** Brand reorder added (previously the only taxonomy entity with none); reorder-concurrency guards threaded through all four entities; Option Value read-error vs. true-empty state distinguished; Category root selector's hardcoded 200-row cap replaced with search; master-deactivation confirmation warnings added; Option Value hard delete added with a `23503` FK-guard fallback (mirrors the existing Variant hard-delete pattern).
- **Dashboard/Orders:** the four remaining `.limit(1000)`-capped metrics now use exact counts/bounded pagination; Orders query is now bounded (100/page, cursor pagination, completed/cancelled excluded by default); `useOrderRealtimeNotifications` reuses one `AudioContext` instead of leaking one per notification.
- **Compact pagination** (`CompactPagination`/`buildPaginationRange`) adopted on Products; Brands/Categories/Option Types/Admin Users still render every page number — tracked, not fixed this round.
- **Product search** now matches Brand, curated search keywords, and Variant SKU/barcode, not just Product name — still in-memory/bounded per the hook's documented single-store-scale rationale, not a server-side query.

Verification: full `pnpm vitest run` — 490/490 tests passing; `pnpm tsc --noEmit` — 0 errors; `pnpm biome ci` — 0 errors (pre-existing nursery warnings only). No hosted DB or live browser access was available in this round's sandbox (reconfirmed directly, same denial as the "Known blocker" section below) — every item above is verified at the code/regression-test/type-check/lint level only. Full RED→GREEN narrative in `docs/KIOSK_ADMIN_TDD_EXECUTION_LOG.md`'s "Consolidation/correctness repair round" section.

## Known blocker: hosted DB / browser verification network access

This session's sandbox egress proxy rejects the hosted Supabase host outright:

```
$ curl https://lccplcswursecygwpltj.supabase.co/rest/v1/ ...
curl: (56) CONNECT tunnel failed, response 403
$ curl "$HTTPS_PROXY/__agentproxy/status"
"recentRelayFailures": [{"kind":"connect_rejected","host":"lccplcswursecygwpltj.supabase.co:443", ...}]
```

`psql` against both the direct and pooler `DATABASE_URL`s also hangs/times out (raw TCP database connections are unsupported by this proxy per its own README). This blocks, in this session:

- Running the real Admin@gmail.com login flow against the hosted project and independently confirming `current_active_profile()`.
- Re-running the supplied pgTAP suites against the current migrations.
- Any live query to independently verify the grants in `20260826050013_lean_rls_grants.sql` are actually applied as written on the hosted project.
- Full browser acceptance across the Admin surfaces.

All eight correctness fixes above, and A1–A4, were instead verified via: (a) direct reading of the migration SQL that defines the authoritative contract, (b) unit/regression tests that fail against the pre-fix code and pass against the fix, (c) `pnpm check:lean-v2` (static Lean V2 validator, no DB connection required), and (d) full `pnpm test`/`type-check`/`ci:check`/`check:deprecated`/`build`. This continuation session additionally started the dev server and drove a real Chromium browser (Playwright) through every Admin route and a real login submission — this proved the proxy-based route protection, i18n routing, and the Supabase Auth wiring are all structurally correct, and independently reproduced the exact same `ERR_TUNNEL_CONNECTION_FAILED` denial on the real `auth/v1/token?grant_type=password` request that curl/Node/psql hit earlier. This is strong evidence the failure is a genuine environment-level network policy, not an application bug — but it is still not a successful hosted login, and no authenticated screen has been visually verified this session. Re-run hosted/browser verification from a network-unblocked environment before treating any hosted/authenticated-browser claim as proven.

## Refine/TanStack architecture — before/after this continuation

Brands, Categories, Option Types, and Option Values are now genuinely on `@refinedev/core`'s `useList`/`useForm`/`useUpdate` (backed by TanStack Query internally) + `@refinedev/react-hook-form` + Zod — list lifecycle, pagination, and simple activate/deactivate mutations are Refine's, not hand-rolled `useState`/`useEffect`. Reorder for all three stays a custom mutation wrapping the `reorder_items` RPC — a deliberate, documented exception, not an oversight (Refine's generic `.update()` cannot express a scoped list-reindex). Products/Variants/Variant Options/Variant Media/Media Assets/Admin Users remain on the manual-repository + hooks pattern, each with a recorded architectural justification (multi-table aggregation, side-channel writes, or a privileged server-only boundary that a generic Refine data provider call cannot express) rather than an unreviewed blanket migration.

## Required implementation order (superseded — see status)

1. ~~Complete catalog taxonomy CRUD (delete/reference behavior, reorder UI, search/filter/pagination).~~ **Done** except hard delete (intentionally deferred — see the Categories/Option Types/Option Values rows above).
2. ~~Complete Product editor (update, activation, full category/brand editing after create) and wire Variant Options / Variant Media into the UI.~~ **Done.**
3. ~~Build the Media Library upload/register UI once Cloudinary credentials are supplied.~~ **Implementation done**; live verification still blocked (no Cloudinary credentials in this environment, egress denied).
4. ~~Complete Admin Users (search/filter/pagination UI, Auth-user creation, role editing UI).~~ **Done.**
5. ~~Migrate simple table-shaped CRUD onto real Refine hooks.~~ **Done for Brands/Categories/Option Types/Option Values** (the plain single/two-table CRUD resources); Products/Media/Admin Users deliberately stayed manual per the architecture note above.
6. Re-run hosted/browser verification from a network-unblocked environment. **Still the one genuine open item** — everything else in this list is implemented and unit/regression-tested.

## Completion rule

No row is complete until the relevant mutations have been tested against the authorized hosted Supabase project, refetched, reloaded in a real browser, and independently verified where practical. Local Docker limitations and this session's network-egress blocker must be recorded separately and must not be represented as hosted or local acceptance interchangeably.
