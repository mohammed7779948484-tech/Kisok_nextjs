# KISOK Admin V2 — Completion Matrix

**Audit baseline:** current HEAD on `feat/lean-v2-admin-integration` (post `89318ae`, this session's fixes included).

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

## Feature acceptance matrix

| Resource | Read | Search | Filter | Sort | Pagination | Create | Update | Deactivate | Delete | Reorder | Relations | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Brands | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ⚠️ repo method, no UI | ⚠️ repo method, no UI | ❌ | ❌ | ⚠️ partial | ✅ |
| Categories | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ (incl. reparent) | ✅ | ❌ | ⚠️ repo method, no UI | ⚠️ partial | ✅ |
| Option Types | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ repo method, no UI | ⚠️ repo method, no UI | ❌ | ❌ | ⚠️ partial | ✅ |
| Option Values | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ partial | ✅ | ❌ | ⚠️ repo method, no UI | ⚠️ partial | ✅ |
| Products | ✅ (incl. corrected stock status) | ❌ | ❌ | ❌ | ❌ | ⚠️ partial (no full editor) | ❌ missing | ❌ missing | ❌ | ❌ | ⚠️ partial (brand/category on create only) | ✅ |
| Product Categories | ⚠️ read-through-Product only | – | – | – | – | ✅ (on Product create) | ❌ | – | ❌ | – | ⚠️ partial | ✅ |
| Variants | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (DB-generated SKU) | ⚠️ repo method, no UI | ⚠️ repo method, no UI | ❌ | ❌ | ⚠️ repo method, no UI | ✅ |
| Variant Options | ❌ (no read UI) | – | – | – | – | ⚠️ repo method, no UI | ⚠️ repo method, no UI (now failure-safe, see bug #5) | – | ❌ | – | ⚠️ repo method, no UI | ✅ repo-level |
| Variant Media | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Media Assets | ✅ | ❌ | ❌ | ❌ | ❌ | ⚠️ signature code exists, no upload UI | ❌ | – | ✅ (usage-guarded, compensation now complete) | – | ✅ | ✅ |
| Inventory | ✅ | ❌ | ❌ | ❌ | ❌ | – | ✅ (adjust/set-qty RPCs) | – | – | – | ✅ | ✅ |
| Orders | ✅ | ❌ | ❌ | ❌ | ❌ | – | ✅ per-role via RPC (now role-correct, see bug #2) | – | – | – | ✅ | ✅ |
| Admin Users | ✅ (now server-boundary-correct, see bug #1) | ✅ | ❌ | ❌ | ⚠️ repo method, no UI | ❌ (no Auth-user create flow) | ⚠️ only `is_active` wired to UI | ✅ | ❌ | – | – | ✅ |
| Store Settings | ✅ | – | – | – | – | – | ✅ (incl. logo picker) | – | – | – | ✅ | ✅ |
| Dashboard | ✅ (now correct global counts, see bug #3) | – | – | – | – | – | – | – | – | – | ✅ | ✅ |
| Auth | ✅ login/protect/logout/refresh persistence | – | – | – | – | – | – | – | – | – | – | ⚠️ policy-level only; real hosted login untested this session (see blocker) |

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

All eight correctness fixes above were instead verified via: (a) direct reading of the migration SQL that defines the authoritative contract, (b) unit/regression tests that fail against the pre-fix code and pass against the fix, (c) `pnpm check:lean-v2` (static Lean V2 validator, no DB connection required), and (d) full `pnpm test`/`type-check`/`ci:check`/`check:deprecated`/`build`. This is real evidence for the code-level correctness of each fix, but it is not hosted or browser proof — that remains a genuine, environment-level blocker for this session, not a shortcut taken on the work itself. It should be re-run from an environment with real network access to `*.supabase.co` before treating any hosted/browser row above as proven.

## Required implementation order (unchanged from prior review, still valid)

1. Complete catalog taxonomy CRUD (delete/reference behavior, reorder UI, search/filter/pagination).
2. Complete Product editor (update, activation, full category/brand editing after create) and wire Variant Options / Variant Media into the UI (repository methods already exist and are tested).
3. Build the Media Library upload/register UI once Cloudinary credentials are supplied (signing code is implemented and tested; only the credential and the upload UI are missing).
4. Complete Admin Users (search/filter/pagination UI, Auth-user creation, role editing UI — `admin_update_profile` already supports it).
5. Migrate simple table-shaped CRUD (Brands/Categories/Option Types/Option Values/Media list/Store Settings) onto real Refine hooks + `@refinedev/react-table` + `@refinedev/react-hook-form`, per `docs/refine-integration-plan.md`.
6. Re-run hosted/browser verification from a network-unblocked environment.

## Completion rule

No row is complete until the relevant mutations have been tested against the authorized hosted Supabase project, refetched, reloaded in a real browser, and independently verified where practical. Local Docker limitations and this session's network-egress blocker must be recorded separately and must not be represented as hosted or local acceptance interchangeably.
