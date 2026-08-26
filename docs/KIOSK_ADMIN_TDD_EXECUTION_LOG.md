# KISOK Admin V2 — TDD Execution Log

This log records meaningful behavior slices using the required **RED → GREEN → REFACTOR → integration → browser** sequence. It intentionally records only concise evidence, not massive terminal logs.

## Baseline audit

The current PR branch contains a working Auth/route foundation, Lean V2 migrations, hosted schema verification, and an operational shell, but most business Features are still local, deferred, mocked, or staged. No business Feature is counted complete from route existence or unit tests alone. The full gap matrix is in `docs/KIOSK_ADMIN_COMPLETION_MATRIX.md`.

## Locale routing regression

**Feature:** Always-prefixed locale URLs for login and Admin routes.

**RED:** Added `src/i18n/routing.test.ts` expecting `routing.localePrefix` to be `always`; it failed because the configuration was `never`. Added `src/lib/config/seo.test.ts` for a default-locale canonical URL; it failed because the canonical URL lacked `/en/`.

**GREEN:** Changed the routing policy to `localePrefix: 'always'`, simplified sitemap/SEO URL generation to consistently prefix every locale, and corrected the single-locale SEO test expectation. Focused routing/SEO tests passed and TypeScript passed.

**Integration:** Dev-server smoke returned `/en/login` as HTTP 200 with login content, `/en/admin` as the unauthenticated login page without a redirect loop, and `/login` as a safe 307 redirect to `/en/login`.

**Commit:** `4d0b306` — `fix(i18n): prevent localized auth route redirect loop`.

## Hosted Lean V2 database foundation

**Feature:** Hosted schema and supplied pgTAP contract.

**Integration:** All 13 Lean V2 migrations were applied to the explicitly authorized hosted project through its pooler. Structural pgTAP passed 29/29 and behavioral pgTAP passed 30/30. The behavioral suite rolls back its fixture data. This validates the database foundation, not application CRUD completion.

**Commit:** `3af2c3d` — `feat(db): validate lean v2 against hosted supabase`.

## Inventory adapter foundation — requires contract repair

**Feature:** Inventory adjustment adapter.

**RED/GREEN history:** An earlier TDD slice added `src/infrastructure/supabase/inventory/adapter.test.ts`, observed the missing adapter behavior fail, implemented the minimum adapter, and passed the focused test.

**Current audit:** The adapter still uses handwritten argument names and enum values that drift from Lean V2. Before this adapter is used by production UI, write a new exact-contract test, observe the expected failure, generate/adopt authoritative database types, correct the adapter, then run the complete hosted inventory integration sequence and browser persistence flow.

## Generated database types and typed clients

**Feature:** Authoritative hosted Lean V2 database types and typed Supabase clients.

**RED:** Added `client-types.test.ts` requiring browser and server factories to return `SupabaseClient<Database>`; `pnpm type-check` failed because both factories were untyped.

**GREEN:** Added `src/infrastructure/supabase/database.types.ts` generated from the authorized hosted project, typed both SSR/browser clients, and added the safe repeatable `pnpm supabase:types` command. The generator captures CLI output and writes only the TypeScript payload without secrets.

**Verification:** The generation command succeeded against the hosted project; the generated file was checked for credential-like content; focused type tests and `pnpm type-check` passed.

**Commit:** `669c7ed` — `chore(supabase): generate lean v2 database types`.

## Inventory repository and UI vertical slice

**Feature:** Real Inventory reads and transactional mutations.

**RED:** Added exact RPC contract coverage for `stock_received` using `variant_id`, `type`, `delta`, and `reason`; the old adapter failed with `p_*` argument names. Added a Set Quantity adapter test; it failed because the function was missing. Added repository and UI tests; the old fixture-backed repository/panel failed on synchronous local data and absent actions.

**GREEN:** Corrected the adapter with generated enum/argument types, added `setInventoryQuantity`, replaced the local Inventory binding with a typed Supabase repository, added joined Product/Variant identity and variant/global threshold resolution, and implemented asynchronous Inventory UI states plus adjustment and Set Quantity flows.

**Integration:** Authenticated login succeeded against the authorized hosted project. An isolated `KIOSK_TEST_` Product/Variant was created, stock received, queried, Set Quantity applied, ledger rows verified, invalid direction and missing reason rejected, and all test records cleaned. Sanitized evidence: receive quantity `3`, Set Quantity result `1`, ledger rows `2`, both invalid cases rejected, cleanup counts `0`.

**Tests:** Focused adapter, repository, UI, and generated-client tests passed; related TypeScript check passed.

## Next required slices

Each feature below must add its own RED evidence before production changes:

1. Generated database types and typed clients.
2. Real Inventory reads, adjustments, set quantity, ledger, and threshold behavior.
3. Brands and Categories CRUD/reorder/hierarchy.
4. Option Types and Values CRUD/dependent selection.
5. Products, Variants, Options, Categories, and Media relations.
6. Cloudinary upload/register/reuse/guarded deletion.
7. Orders transitions and cancellation restoration.
8. Privileged Admin Users and persistent Store Settings.
9. Correct Dashboard aggregates and recent-order query semantics.

A slice is not complete until focused tests, related Feature tests, type checks, hosted integration, and real browser persistence verification pass.

## Hosted runtime boundary cleanup

**Feature:** Active production runtime no longer falls back to a deferred Refine provider or a local admin-access gate.

**RED:** Added regressions requiring the active Refine provider to omit `deferred-data-provider`, requiring the deferred module and placeholder adapters to be absent, requiring the real hosted repository/auth boundaries to exist, and requiring one root `'use client'` directive. The focused tests failed on the deferred import, placeholder files, stale resource expectations, and duplicate directive.

**GREEN/REFACTOR:** Removed the deferred provider module and seven unused placeholder Supabase adapters, made the configured Refine runtime use the typed hosted Supabase provider, preserved explicit child rendering when no client is configured, removed the unreachable LocalAccessGate/local repository/type files, corrected the runtime resource test to actual Lean table names, and removed the duplicate provider directive.

**Verification:** `pnpm vitest run src/infrastructure/refine/refine-runtime.test.ts src/infrastructure/supabase/supabase-boundary.test.ts` passed 5/5 and `pnpm type-check` passed under Node 24. The remaining Vite CommonJS/ESM message is an existing warning from the test configuration.

## Current completion boundary

Inventory and Brands have hosted authenticated mutation evidence. Categories and Option Library currently have hosted reads only. Products have hosted list/create and variant repository coverage, but not the complete editor and relation workflows. Orders have hosted reads and a tested New→Preparing UI transition, but cancellation, item details, and full integration proof remain. Admin Users have hosted search only; privileged server-only mutations remain. Media has hosted metadata reads only; Cloudinary configuration and secure upload/delete flows remain absent. Store Settings has hosted read/update coverage but no logo picker. Dashboard is a hosted projection but still requires semantic aggregate and browser proof. No final completion claim is made.

## Orders item details and cancellation

**Feature:** Hosted Order Item details and transactional cancellation with a required reason.

**RED:** Added UI tests for immutable item identity/quantity rendering and the reason-required cancellation action. They failed because the panel had no item projection, no cancel control, and no cancellation dialog. The repository test then failed until its hosted nested-row fixture asserted the new typed projection.

**GREEN:** Extended the typed Orders contract and Supabase query to select only operational `order_items` snapshot fields, rendered item identity/variant/options/quantity, and added a cancellation dialog that calls `update_order_status(order_id, 'cancelled', trimmed_reason)` and refetches on success. Existing status advance behavior remains covered.

**Integration:** Authenticated Admin cancellation against the authorized hosted project succeeded on an isolated `KIOSK_TEST_` order. Sanitized evidence: status persisted as `cancelled`, reason persisted, inventory moved from `2` to `4`, exactly one `order_cancellation_restoration` ledger row with quantity change `2`, and cleanup completed.

**Tests:** Orders repository/UI tests passed 6/6 and TypeScript passed under Node 24. Full browser order workflow remains unverified.

## Categories hosted lifecycle

**Feature:** Hosted Category create/update/reparent/deactivate and complete-scope reorder.

**RED:** Added repository tests for create/update with an optional parent and the exact `reorder_items(resource_name, scope_id, ordered_ids)` RPC; both methods were initially absent. Added panel tests for child creation and deactivation; the controls were initially absent.

**GREEN:** Added typed Category input/update/reorder operations against `categories` and the Lean reorder RPC, then added a mode-aware Category dialog with root/child selection, edit, active-state toggle, loading/error handling, and refetch after mutation. The UI communicates the two-level hierarchy rule; the database trigger remains authoritative for third-depth rejection.

**Integration:** Authenticated Admin mutation against the authorized hosted project succeeded on isolated `KIOSK_TEST_` root/child records. Sanitized evidence: child reparented, child deactivated, third-depth insert rejected, child scope reordered, root/global scope reordered, and cleanup completed.

**Tests:** Categories repository tests passed 3/3; Catalog panel tests passed 5/5; TypeScript passed under Node 24. Full browser category flow remains unverified.

## Option Library hosted lifecycle

**Feature:** Hosted Option Type and dependent Option Value creation, active-state updates, and scoped reorder.

**RED:** Added repository tests for missing create/update/reorder methods and UI tests for missing Option Type/Value dialogs and Value activation controls; the focused suites failed on those absent behaviors.

**GREEN:** Added typed repository operations for `option_types` and `option_values`, delegated ordering to the exact `reorder_items` RPC with `option_values` scope, and implemented accessible hosted dialogs and active-state controls in the Option Library panel.

**Integration:** Authenticated Admin mutation against isolated `KIOSK_TEST_` Option Type/Value records succeeded. Sanitized evidence: Value update and deactivation persisted, Value scope reorder succeeded, Option Type global scope reorder succeeded, and cleanup completed.

**Tests:** Option Library repository/UI tests passed 6/6 and TypeScript passed under Node 24. Full browser Option Library workflow remains unverified.

## Dashboard hosted aggregate semantics

**Feature:** Operational Dashboard counts and low-stock semantics.

**RED:** Added a Dashboard adapter test requiring active-product/active-variant semantics, exact inventory-adjustment counts, settings-driven effective thresholds, and recent-order query ordering. The test failed against the previous hardcoded threshold, limited adjustment read, and inactive-row counts. Added a pure threshold resolver test, which initially failed because the resolver was absent.

**GREEN:** Added `resolveLowStockThreshold(variantOverride, globalThreshold)`, loaded the singleton Store Settings threshold, selected exact adjustment counts with a count query, ordered recent orders in the database query, and counted only active variants belonging to active products. Unconfigured and error states remain explicit.

**Verification:** Dashboard adapter/model tests passed 3/3 and TypeScript passed under Node 24. Hosted browser refresh proof and a live hosted Dashboard read remain outstanding.

## Product Category assignment

**Feature:** Persistent Product-to-Category assignment without invented primary/ranking fields.

**RED:** Added a repository test requiring `product_categories` rows for selected category IDs; the initial Product repository only inserted the Product row and did not write relations. Added a UI test requiring Brand and Category controls; the initial panel exposed neither.

**GREEN:** Added optional typed `categoryIds`, duplicate elimination, relation insertion, compensation by deleting the newly created Product when relation insertion fails, and hosted Brand/Category selectors in the Product creation dialog. The relation payload contains only `product_id` and `category_id`.

**Verification:** Product UI/repository tests passed 7/7 and TypeScript passed under Node 24. A separate hosted Product Category mutation proof and full Product editor/variant/media workflow remain outstanding.

## Admin Users server-only profile updates

**Feature:** Active-state changes for Admin User profiles through a server-only boundary.

**RED:** Added operation tests for denial without a trusted active Admin session and exact `admin_update_profile` arguments, then added a server-action delegation test and a panel deactivation test. The action module and panel control were initially absent.

**GREEN:** Added a server-only service-role operation that first calls the request-scoped trusted Admin session guard, then invokes typed Lean `admin_update_profile`; added a thin `'use server'` action and an accessible activate/deactivate control with refresh/error/busy states. The service-role key is read only in the server module and is not imported by the browser repository.

**Tests:** Operation/action/panel tests passed 5/5 and TypeScript passed under Node 24. Non-admin/inactive integration denial, self-demotion and last-active-admin guards, Auth Admin user creation/reset, role editing, and full browser proof remain outstanding.

**Hosted integration:** An isolated `KIOSK_TEST_` Auth user and profile were created through the authorized hosted project, updated through `admin_update_profile` using the isolated Admin actor, verified as persisted, and cleaned. A non-admin actor attempt was rejected. Self-demotion, last-active-admin invariants, Auth Admin reset/create UI, and browser invocation remain unverified.

## Product Variant hosted lifecycle foundation

**Feature:** Product-scoped Variant reads and Lean operational field updates.

**RED:** Added tests for missing `listVariants(productId)` and `updateVariant(id, input)` methods; both initially failed because the repository exposed create only.

**GREEN:** Added typed hosted Variant listing ordered by `display_order` and updates for barcode, title override, low-stock threshold, and active state. SKU remains database-generated and no financial fields were introduced.

**Tests:** Variant lifecycle plus existing Product repository tests passed 5/5 and TypeScript passed under Node 24. Product UI variant management, option combinations, media links, and hosted/browser persistence remain outstanding.

## Product Variant manager

**Feature:** Product-scoped Variant creation and hosted listing in the Product Catalog panel.

**RED:** Added a UI test requiring a Manage Variants flow and database-generated-SKU creation; the initial Product panel had no Variant action or editor.

**GREEN:** Added hosted Variant list/update repository support and a Variant manager dialog with loading/empty/error states, generated-SKU messaging, title/barcode/threshold fields, and refetch after creation. Blank optional fields are omitted from the mutation payload.

**Tests:** Product Catalog UI and repository tests passed 10/10 and TypeScript passed under Node 24. Variant edit controls, option-combination persistence, media links, hosted integration, and browser persistence remain outstanding.

## Variant option combinations and Cloudinary signing foundation

**Variant options RED/GREEN:** Added a failing repository test for replacing a Variant's typed Option Value pairs. Implemented duplicate Option Type rejection, deletion of the prior combination, and typed `variant_option_values` insertion. Lean's composite foreign key remains authoritative for rejecting a Value paired with the wrong Type. The relation is repository-tested but not yet wired into the Variant UI or independently hosted-verified.

**Cloudinary RED/GREEN:** Read the official Cloudinary Upload API and asset-deletion documentation. Added a failing deterministic signature test, then implemented server-only SHA-1 canonicalization with strict API-secret validation and exclusion of non-signature fields. Cloudinary configuration has not been supplied, so real upload, metadata registration, usage guard, compensated delete, and browser verification remain blocked.

## Media Asset usage-guarded deletion

**Feature:** Media Asset deletion through an authenticated server action.

**RED:** Added tests for blocking deletion when `get_media_asset_usage` reports references, restoring metadata after Cloudinary failure, and panel invocation; the delete operation/action/control were initially absent.

**GREEN:** Added an active-Admin server action using the service-only Supabase client, the hosted usage RPC, Cloudinary signed Destroy request with CDN invalidation, and metadata restoration on Cloudinary failure. Added an accessible panel delete control with busy/error/refresh states. Cloudinary credentials are not configured in this environment, so real asset upload/delete and browser proof remain unverified.

**Tests:** Media panel, repository, delete operation, action, and signature tests passed 8/8 and TypeScript passed under Node 24.

## Store Settings logo Media Asset selection

**Feature:** Persistent selection of an existing hosted Media Asset as the Store Settings logo.

**RED:** Added a panel test requiring hosted Media Asset loading when the editor opens and persistence of the selected ID; the existing dialog had no media picker.

**GREEN:** Added an async Media Library repository-backed selector, initialized from the persisted singleton, and included `logoMediaAssetId` in the Lean Store Settings update. The UI preserves a deliberate empty selection and reports picker errors.

**Tests:** Store Settings panel/repository and Media repository tests passed 4/4 and TypeScript passed under Node 24. New Cloudinary upload and full browser reload proof remain outstanding.

## Critical correctness bug fixes (fresh discovery pass, this session)

Every claim below was independently re-verified against the actual code at current HEAD before any fix — none were taken on faith from a prior review. Full detail and evidence in `docs/KIOSK_ADMIN_COMPLETION_MATRIX.md`'s "Critical correctness bugs" table.

**Admin Users search boundary.** RED: `admin-user-search.test.ts` (new) failed — the module didn't exist. GREEN: added `executeAdminUserSearch` mirroring the existing `executeAdminUserUpdate` server-only pattern (`getTrustedAdminSession` guard + service-role RPC), rewired `adminUsersRepository.search` to call it through a new `searchAdminUsers` server action, and replaced `repositories/users.test.ts` (which had been asserting the buggy browser-client call as intended behavior) with a regression that throws if the browser client is ever touched for this operation. Extracted the duplicated service-role client construction (previously copy-pasted in `admin-user-operation.ts` and `media-library/server/actions.ts`) into `src/infrastructure/supabase/client/service-client.ts`.

**Admin Orders role-scoped transitions.** RED: rewrote the "advances an active order" `OrdersPanel.test.tsx` case, which had asserted an Admin actor advancing `new→preparing` (a Preparation-only transition per `update_order_status`), to instead assert `ready→completed`, plus a new case asserting no "Advance status" control renders for `new`/`preparing` orders. Both failed against the old `nextStatus`. GREEN: replaced `nextStatus` with `nextStatusForAdmin`, returning `completed` only from `ready`.

**Dashboard open-order count.** RED: `dashboard.test.ts` new case seeds 8 open orders (over the 5-row cap) and asserts `openOrderCount === 8`; failed under the old `orderRows.filter(...)` derivation (capped at 5). GREEN: added an independent `count:'exact', head:true` query with `.not('status','in','(cancelled,completed)')`.

**Product low-stock threshold.** RED: two new `product.test.ts` cases — a quantity-1/global-threshold-2 case expecting `'Low stock'` (would have passed the old `<=5` hardcode for the wrong reason) and a variant-override-above-global case (`threshold=10` vs `global=0`, quantity 8) expecting `'Low stock'`, which the old hardcoded `<=5` logic could never produce. Both failed pre-fix. GREEN: extracted `resolveLowStockThreshold` out of the Dashboard feature into `src/lib/utils/inventory/low-stock-threshold.ts` and made Product Catalog and Inventory both call the same function Dashboard already used.

**Variant Option replacement atomicity.** RED: rewrote `variant-options.test.ts` around a diff-based contract (insert/update/delete call assertions) plus a new "never loses the prior combination when a mid-way write fails" case that fails the insert and asserts zero `update`/`delete` calls happened. Failed against the old blind DELETE-then-INSERT. GREEN: replaced it with a read-existing → diff → insert-additions → update-changed → delete-removed sequence, so a failure during insert/update never touches surviving Option Types.

**Media Asset delete-compensation completeness.** RED: `actions.restore-metadata.test.ts` (new, mocks `@supabase/supabase-js` directly rather than the higher-level `delete-media` module so the real mapping/restore code runs) asserts the restore INSERT payload includes the original `asset_id`/`created_by`; failed pre-fix since `mapAsset`/`MediaAssetRecord` dropped both fields even though the `getAsset` query selected them. GREEN: added `assetId`/`createdBy` to `MediaAssetRecord` and both `mapAsset` implementations, included them in the restore INSERT.

**Seed reproducibility.** RED: `test/seed-coherence.test.ts` (new, pure text-parsing, no DB connection) asserts every seeded `orders.display_number` matches the Lean V2 CHECK constraint's alphabet and that `inventory.current_quantity` equals the exact sum of that variant's `inventory_adjustments` ledger; both assertions fail when run against `git show HEAD:supabase/seed.sql` (confirmed). GREEN: replaced `KSK001`…`KSK005` with `KS2AB2`…`KS2AB6`, and moved/recomputed the `current_quantity` seed to the true post-ledger cumulative values (7/19/1/4). Also added `scripts/seed-local-auth.sh` (previously Windows-only via `.ps1`) and documented local login credentials in `docs/LOCAL_SUPABASE_SETUP.md`.

**Verification:** `pnpm test` — 61 files / 198 tests passed (was 58/185). `pnpm type-check`, `pnpm ci:check`, `pnpm check:deprecated`, `pnpm check:lean-v2`, `pnpm build` all passed. Hosted DB and browser verification were **not** possible this session — the sandbox's egress proxy rejects the hosted Supabase host (`403` on HTTPS CONNECT, `psql` hangs on both direct and pooler `DATABASE_URL`s) — see the completion matrix's "Known blocker" section for the exact proxy status output. All eight fixes above are verified at the code/test level only; hosted/browser re-verification is required once network access is available.
