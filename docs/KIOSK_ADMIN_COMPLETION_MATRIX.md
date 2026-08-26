# KISOK Admin V2 — Completion Matrix

**Audit baseline:** `f53da92` on `feat/lean-v2-admin-integration`.

**Authority:** Lean V2 migrations and the explicitly authorized hosted Supabase project. A route, configured data provider, fixture-backed component, or unit mock is not counted as completed CRUD.

## Feature acceptance matrix

| Feature | Read | Create | Update | Delete / deactivate | Special operation | Browser tested | Current status / next proof |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Brands | Hosted typed repository | Hosted create | Hosted update | Hosted deactivate | Search, reorder, reference-safe delete, and full browser persistence remain | No | Partial hosted CRUD; complete lifecycle and browser proof. |
| Categories | Hosted hierarchy read | Hosted create | Hosted update/reparent | Hosted deactivate | Two-level hierarchy and scoped reorder are implemented; third-depth rejection is database-verified; reference-safe deletion and browser proof remain | No | Partial hosted lifecycle; finish deletion and browser persistence. |
| Option Types | Hosted typed read | Hosted create | Repository update | UI active-state/reorder/delete not implemented | Global reorder repository path is implemented; full lifecycle and browser proof remain | No | Partial hosted lifecycle; finish controls and dependency behavior. |
| Option Values | Hosted nested read | Hosted create | Repository update | Hosted active-state control | Type-scoped reorder is implemented and hosted-verified; invalid type/value validation and browser proof remain | No | Partial hosted lifecycle; finish dependency validation and browser proof. |
| Products | Hosted typed list/read with brand, variants, and inventory aggregation | Hosted create without financial fields | Editor not implemented | Activation not implemented | Brand selector and Product Category assignment are implemented; variants, options, media, search/pagination, and full browser persistence remain | No | Partial hosted editor; complete variant/options/media workflow. |
| Product Categories | Joined through Product workflow only | Hosted assignment on Product create | Not implemented | Not implemented | Relation payload contains only product/category IDs; unlink, leaf enforcement, and browser proof remain | No | Partial relation persistence; complete lifecycle. |
| Product Variants | Repository create with database-generated SKU | Repository create | UI lifecycle not implemented | UI lifecycle not implemented | Barcode, threshold, active state, option combinations, media, and browser proof remain | No | Complete variant lifecycle and relation UI. |
| Variant Option Values | Not implemented | Not implemented | Not implemented | Not implemented | Type/value dependency and duplicate-combination guard not implemented | No | Persist relations with database-compatible validation. |
| Product Variant Media | Not implemented | Not implemented | Not implemented | Not implemented | Link, primary, reorder, unlink-without-delete not implemented | No | Implement relation operations and picker flow. |
| Media Assets | Hosted typed metadata read | Not implemented | Not implemented | Not implemented | Cloudinary upload/register/reuse, usage guard, and compensated deletion not implemented | No | Await Cloudinary configuration and secure server boundary. |
| Inventory | Hosted typed repository with joined Product/Variant identity and effective threshold | Via Lean transactional RPCs | Via `apply_inventory_adjustment` and `set_inventory_quantity` RPCs | Not applicable; ledger-preserving operations | Adjustment history, reason validation, loading/error/refresh states implemented | Focused UI tests and hosted authenticated integration passed; browser reload proof remains | Complete for current vertical-slice scope; add browser session evidence. |
| Orders | Hosted typed list with item metadata | Not applicable | Hosted status RPC and New→Preparing→Ready→Completed UI actions | Hosted cancellation with reason | Cancellation restoration and one-time ledger compensation are hosted-verified; full transition/browser proof remains | No | Partial operational workflow; finish acceptance proof. |
| Admin Users | Hosted `search_admin_profiles` RPC | Not implemented | Server-only `admin_update_profile` action | Server-only activate/deactivate action | Trusted active-Admin guard, isolated hosted profile update, and non-admin rejection are verified; create/role/reset/invariant/browser proof remain | No | Partial secure mutation boundary; finish full management workflow. |
| Store Settings | Hosted singleton read | Not applicable | Hosted Lean-field update | Not applicable | Logo media picker, reset values, and browser reload proof remain | No | Complete settings/media workflow. |
| Dashboard | Hosted operational projection | Not applicable | Not applicable | Not applicable | Database-level recent ordering, exact adjustment count, active product/variant scope, and effective threshold semantics are implemented and unit-tested; hosted/browser refresh proof remains | No | Semantics corrected; complete live and browser proof. |

## Cross-cutting acceptance

| Area | Current result | Required completion proof |
| --- | --- | --- |
| Generated Supabase types | Implemented | Generated `Database` contract, typed browser/server clients, and typed Inventory RPCs remain current; repeat `pnpm supabase:types` when hosted schema changes. |
| Auth | Real foundation exists | Browser Admin login, protected route, logout, inactive/non-Admin denial, and authenticated CRUD flow with reload persistence. |
| Refine resource mapping | Actual Lean table names are registered | Keep configured runtime on hosted Supabase; privileged Admin User mutations must not use generic browser CRUD. |
| Local/deferred production paths | Removed from active runtime and stale auth seams | Continue static audits; tests/docs may mention fixtures only to prove their absence or describe historical evidence. |
| Cloudinary | Not implemented | Secure server-only signing/upload, metadata registration, reuse, usage guard, deletion compensation, and browser proof. |
| Seed/auth bootstrap | Requires audit | Seed must not create fake login rows; order identifiers and inventory ledger state must satisfy Lean constraints. |
| Design system | Partial | Semantic tokens, shadcn primitives, Kisok wrappers, consistent states, and accessibility checks across active features. |
| Security | Tracked secret-bearing config removed and ignored locally | No tracked secrets, no service-role/Cloudinary secret in client bundle, and privileged boundaries tested. Previously pasted credentials must be rotated by the owner. |
| No-pricing rule | Core active UI audit is clean | Final repository audit must show no active price, pricing, currency, cost, tax, payment, revenue, amount, or financial-inventory-value domain. |
| CI and hosted integration | Focused hosted evidence exists for Inventory, Brands, Products, Orders, Categories, Options, and Admin profile updates | Add a protected/manual hosted integration gate using externally supplied secrets and complete final PR checks. |

## Required implementation order

1. Complete catalog taxonomy CRUD, hierarchy, reorder, and dependency validation.
2. Complete Products, categories, variants, option combinations, and media relations.
3. Add the secure Cloudinary/media boundary and Media Library workflows.
4. Complete Orders transitions, cancellation, items, and inventory restoration proof.
5. Add server-only Admin Users mutations and persistent Store Settings media selection.
6. Correct Dashboard aggregates and query semantics.
7. Complete design/accessibility/static audits, browser E2E, documentation, full validation, and PR #6 update.

## Completion rule

No row is complete until the relevant mutations have been tested against the authorized hosted Supabase project, refetched, reloaded in a real browser, and independently verified where practical. Local Docker limitations must be recorded separately and must not be represented as hosted or local acceptance interchangeably.
