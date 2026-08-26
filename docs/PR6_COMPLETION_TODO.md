# PR #6 Completion TODO

Single source of truth for this continuation. Starting HEAD: `06cfa8f`. Update continuously; do not rely on chat memory.

## Network blocker (diagnosed exhaustively before anything else — see full evidence below)

**Status: genuine, confirmed organization egress policy denial. Not worked around; not retried further.**

- `curl https://lccplcswursecygwpltj.supabase.co/rest/v1/` → `403` on HTTPS CONNECT.
- `NODE_USE_ENV_PROXY=1 node -e "fetch(...)"` (same HTTPS_PROXY the shell uses) → `fetch failed`; proxy status log recorded a fresh `connect_rejected` at the same timestamp — same policy denial via the Node runtime, not a curl quirk.
- `psql` direct (`db....supabase.co:5432`) → hangs/errors within 8s.
- `psql` pooler (`aws-0-us-east-2.pooler.supabase.com:6543`) → hangs within 8s, no output.
- `curl "$HTTPS_PROXY/__agentproxy/status"` → `recentRelayFailures` shows repeated `connect_rejected` / `"gateway answered 403 to CONNECT (policy denial or upstream failure)"` for `lccplcswursecygwpltj.supabase.co:443`.
- The proxy's own `/root/.ccr/README.md` states explicitly: *"403/407 from the proxy: The destination host is not allowed by your organization's egress policy for this session. Do not retry or route around it — report the blocked host."* and lists *"raw-TCP databases"* under *"Not supported through the proxy (report, do not work around)."*
- All outbound HTTPS from this sandbox (curl, Node, the Supabase CLI, a browser opened in this sandbox) routes through the single proxy at `127.0.0.1:36613` — there is no alternate network path inside this session to test separately; the Node-fetch test above already proves the denial is host-level, not tool-level.
- `env -u HTTPS_PROXY` bypass and the GitHub-Actions-with-secrets alternative were **not** attempted: the README explicitly says never unset `HTTPS_PROXY`, and this session has no ability to add repository secrets (no push access to Settings), so a CI job using them would be unverifiable speculation, not real evidence.

**What this blocks:** real hosted Admin login test, live pgTAP re-run, independent RLS-grant confirmation, live Cloudinary upload/delete, and any browser flow that needs the hosted DB to actually return data (the dev server itself can still run and pages can render, but data fetches to Supabase will fail the same way).
**What this does NOT block:** every implementation task below — Refine/TanStack/RHF architecture, Product/Variant/Media/Admin-Users UI, design-system normalization, unit/regression TDD, build, and running the dev server to inspect rendering/routing/forms structurally.

## A. Blocking correctness fixes (verify against current HEAD first, then TDD-fix)

- [x] A1. Auth bootstrap: reset the password of an *already-existing* local Auth user, not silently reuse a stale/unusable one. **RED**: `scripts/lib/local-auth-seed.test.ts` "resets the password..." failed (0 PUT calls) against a version that only reused `existing.id`. **GREEN**: `seedLocalAuthUser` now always calls the Admin API PUT `/auth/v1/admin/users/{id}` with the intended password when the user exists. Replaced the separate Windows-only `.ps1`/Linux-only `.sh` scripts with one cross-platform `scripts/seed-local-auth.ts` (`pnpm seed:local-auth`), wired into both `verify-local.sh`/`.ps1`. Cannot be run against a real local Supabase instance in this sandbox (Docker/bridge-networking blocked, pre-existing limitation) — verified at the unit level only.
- [x] A2. Product Catalog stock aggregation must exclude inactive Variants. **Confirmed**: `listProducts()` selected `product_variants(id,low_stock_threshold,inventory(...))` with no `is_active`, so a deactivated Variant's leftover stock counted toward `availableStock`/low-stock/`variantCount`. **RED**: 3 of 4 new cases in `product.test.ts` failed (`active Variant stock semantics` describe block — mixed active+inactive, inactive-with-stock, all-inactive). **GREEN**: filter to `activeVariants` before aggregating; `variantCount` now also means active-variant count, matching Dashboard's `variantCount` semantic.
- [x] A3. Variant Option replacement: cover later-stage failures. **Decision**: a real Postgres RPC would be strictly better, but the Lean V2 migration set is guarded by `scripts/static_validate.py`'s hardcoded `len(files) != 13` check and a "grants live only in the final migration" invariant, and I cannot verify new SQL against the network-blocked hosted DB this session — shipping unverified schema changes to a frozen, previously-applied 13-migration contract was judged too risky. Implemented a client-orchestrated compensating-rollback (saga) instead: every successful insert/update/delete step is tracked; if any later step fails, all tracked steps are undone (in reverse) before the original error is rethrown; if the rollback itself also fails, both errors are combined into one message (never silently swallowed), mirroring the A4 media dual-failure pattern. **RED**: 3 new cases in `variant-options.test.ts` (rollback-after-update-fails, rollback-after-delete-fails, dual-failure-combined-error) failed against the old code. **GREEN**: rollback implemented, all 8 tests in the file pass. **Follow-up recommendation** (recorded, not done): once hosted DB write access is available, replace this with a `security invoker` `replace_variant_option_values(uuid, jsonb)` RPC for true single-transaction atomicity — strictly stronger than the saga.
- [x] A4. Media compensation: `updated_at` preservation + dual-failure surfacing. **Confirmed both gaps**: `getAsset` selected `updated_at` but it was dropped by `mapAsset`/`MediaAssetRecord` before it could be restored (restore fell back to the column default = restore time, not original); and a `restoreMetadata` failure after a `deleteCloudinary` failure propagated only the restore error, silently losing the original Cloudinary-failure context and the fact the asset was now orphaned (Cloudinary asset survives, DB row gone). **RED**: `actions.restore-metadata.test.ts` failed on missing `updated_at` in the restore payload; new `delete-media.test.ts` dual-failure case failed (got only the restore error). **GREEN**: added `updatedAt` to `MediaAssetRecord` end-to-end; `delete-media.ts` now catches a restore failure and throws one combined error naming both failures plus "requires manual reconciliation".

## B. Architecture — Refine/TanStack/RHF made load-bearing

- [ ] B1. Decide and document the concrete migration pattern (one worked example) before repeating it
- [ ] B2. Brands: Refine `useList`/`useCreate`/`useUpdate` + RHF/Zod form
- [ ] B3. Categories: Refine hooks + RHF/Zod, hierarchy preserved
- [ ] B4. Option Types / Option Values: Refine hooks + RHF/Zod
- [ ] B5. Store Settings: Refine singleton pattern + RHF/Zod (wire the existing unused schema)
- [ ] B6. Media Assets list: Refine `useList` for the read/search path
- [ ] B7. Products list: TanStack/Refine table state (search/filter/sort/pagination) replacing the hand-rolled `<table>`
- [ ] B8. Confirm Inventory/Orders/Admin-Users/Cloudinary/Variant-Options remain custom (no regression toward generic CRUD)

## C. Catalog CRUD completion

- [ ] C1. Brands: activate/deactivate + reorder wired into UI (repo methods exist)
- [ ] C2. Categories: reorder wired into UI; delete/reference behavior
- [ ] C3. Option Types: update/activate/reorder wired into UI
- [ ] C4. Option Values: reorder wired into UI; dependent Type→Value selection in Variant editor

## D. Product Editor

- [ ] D1. Product update (name/description/featured/brand/categories/cover) — currently create-only
- [ ] D2. Product activate/deactivate
- [ ] D3. Category reassignment after creation (not create-only)
- [ ] D4. Products list: search/filter/sort/pagination
- [ ] D5. Variant editor: edit (barcode/threshold/title_override/active) wired into UI (repo method exists, no UI)
- [ ] D6. Variant Options UI: Type→Value picker wired to `replaceVariantOptionValues`
- [ ] D7. Variant display name derives from selected Option Values

## E. Media / Cloudinary

- [ ] E1. Upload UI: file picker → signed params → Cloudinary POST → register `media_assets`
- [ ] E2. Variant Media: attach/detach/reorder/primary selection (currently fully missing)
- [ ] E3. Media Library: search/pagination/usage inspection in UI

## F. Admin Users

- [ ] F1. Search UX: pick one deliberate pattern (debounced or explicit-submit), not both live-effect and a button
- [ ] F2. Pagination wired into UI
- [ ] F3. Display name / role edit wired into UI (RPC already supports it)
- [ ] F4. Create Auth user + profile (server-only)
- [ ] F5. Password set/reset flow (server-only)

## G. Browser acceptance (structural — data-dependent parts blocked by the network item above)

- [ ] G1. `pnpm build` succeeds
- [ ] G2. Dev/prod server starts and serves `/en/login`, `/en/admin/*` routes
- [ ] G3. Playwright: open each Admin route, confirm it renders (not a crash/500), screenshot evidence
- [ ] G4. Document precisely which acceptance steps are blocked by the network item vs. actually exercised

## H. Docs / AGENTS.md / README / final validation

- [ ] H1. AGENTS.md: add durable KISOK-specific rules section
- [ ] H2. README: real project README (purpose/stack/setup/scripts/rules)
- [ ] H3. Completion matrix updated with evidence columns (Unit/Hosted/Browser)
- [ ] H4. TDD log updated per slice
- [ ] H5. Full diff review for TODO/FIXME/console./service-role-in-browser/pricing terms
- [ ] H6. All quality gates green, pushed, CI green, PR body updated

---

Legend: check a box only with evidence (test file + result, or file:line). Do not delete unchecked items — if something is genuinely deferred, say why next to it, don't remove it.
