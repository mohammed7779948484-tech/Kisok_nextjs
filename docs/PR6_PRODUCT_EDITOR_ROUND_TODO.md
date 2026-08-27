# PR #6 — Product Editor Round Checklist

> **Scope boundary.** This round is limited to the locale-prefixed Product Create/Edit workflow, its Product Details and Variants tabs, the directly reused Media picker/upload flow, Product activation semantics, and directly related Product/Variant repository and test code. It excludes unrelated Orders, Dashboard, Settings, Users, and broader catalog work unless a minimal direct dependency is required.

## Phase 1 — Inspection and architecture

- [x] Reconfirmed `AGENTS.md`, Lean V2 catalog migrations, current Product routes, existing Product editor components, hooks, repositories, schemas, shared UI primitives, and current tests.
- [x] Recorded a responsibility map through extracted editor hooks, schemas, utilities, and presentation modules; presentation components retain no direct Supabase calls.
- [x] Confirmed the existing test environment and a clean implementation starting state after the preceding PR delivery.

## Phase 2 — Baseline and behavioral contracts

- [x] Ran focused Product editor, repository, Variant option, Media, and route tests before changes.
- [x] Captured Product Create/Edit route behavior and identified query lifecycle, draft creation, cover selection, Variant, and visibility seams.
- [x] Established focused test helpers and Lean V2-shaped fixtures without modifying hosted schema.

## Phase 3 — Focused editor composition

- [x] Reduced `ProductEditorPage` to route-aware layout and dialog orchestration.
- [x] Extracted query/data lifecycle, saved-product mutation orchestration, Product visibility semantics, and Product/Variant presentation components into cohesive units.
- [x] Scoped Product detail, category, reference, Variant, Media, and Option queries by route/product identifier so cache responses are isolated per active editor key.

## Phase 4 — Product Details tab and draft creation

- [x] Delivered Product Details and Variants tabs with focused preservation regression coverage for unsaved Product form state.
- [x] Kept Product Create inactive and prohibited Variant work until the first draft has a real ID; authenticated keyboard browser verification passed.
- [x] Included selected cover asset IDs in the initial Product insert; no post-create cover write is needed, and saved-draft recovery prevents a repeated partial create.
- [x] Kept Product identity, normalized search keywords, Brand/categories, featured/draft state, readiness, and central customer-visibility reasons clear and actionable.
- [~] Added focused RED → GREEN regressions for draft creation, cover write, partial-category recovery, hydration, and tab preservation. Leave-protection coverage remains in the existing shared hook rather than a new scoped editor regression.

## Phase 5 — Reusable visual Media picker

- [x] Built a reusable visual, searchable, bounded Media picker with loading, empty, error/retry, selection, and page navigation states.
- [x] Integrated Product cover preview, Change, and Remove actions without UUID-first UI.
- [x] Supported existing asset selection and validated upload through the existing Cloudinary/metadata abstraction.
- [x] Added progressive camera capture with unsupported/denied fallbacks, retake/confirm flow, and reliable MediaStream cleanup.
- [x] Added focused RED → GREEN coverage for picker selection, bounded pages, validation, upload handoff, and camera cleanup states; existing upload compensation tests remain in the Media suite.

## Phase 6 — Variant tab, cards, and Option flow

- [x] Replaced the editor’s large dialog-first management surface with cohesive Variant cards; the compact secondary Variant editor is RHF/Zod-backed.
- [~] Present derived name, SKU, barcode, threshold, active/draft status, Option summary, actual Media count, customer-eligibility state/reasons, and clear actions. Card-level primary-image preview remains a later refinement.
- [x] Preserved distinct Option Types, dependent Option Value loading, removal, canonical duplicate-combination prevention, and central display-name derivation.
- [x] Reused the bounded Media picker for Variant Media while keeping attach/detach/primary/reorder responsibilities in Variant-specific code.
- [x] Ran and retained focused tests for dependent values, one-value-per-type, duplicate-combination ordering, draft variants, and derived names.

## Phase 7 — Central validation and unsafe-state protections

- [x] Centralized Product activation readiness in the editor and routed Product list activation into the validated edit workflow.
- [x] Aligned central diagnostics with Lean V2 active Product/Variant/Brand/Option Type/Option Value semantics and explicitly guarded incomplete Variant eligibility data.
- [~] Preserved hard Variant delete, tested retained friendly error/history-blocked fallback, and kept the dedicated confirmation dialog. Browser mouse confirmation remains unverified because pointer targeting was unreliable in the local browser controller.
- [~] Retained existing dirty-work leave protection and tab-local state preservation. This scoped round did not add dedicated browser unload/back-navigation regressions.
- [x] Preserved inactive existing masters visibly, prevented fresh inactive selections, and surfaced central dependency warnings.

## Phase 8 — TDD and quality verification

- [x] For new behavior, recorded focused RED failures, implemented minimal production code, and reran focused GREEN suites.
- [x] Ran the full `pnpm validate` gate after final regressions: Biome CI, TypeScript, deprecated API, Lean V2 static contract, 118 test files / 393 tests, and optimized production build all passed. The environment still emits the pre-existing Node 22 versus declared Node >=24 engine warning.
- [x] Reviewed the scoped diff for duplicate business rules, stale cache behavior, raw duplicate controls, UI Supabase imports, prohibited pricing terms, and unsafe partial writes.

## Phase 9 — Browser acceptance

- [~] Used the approved authenticated test environment to verify desktop Product Create/Edit behavior. Tablet/mobile viewport acceptance remains unverified.
- [~] Proved keyboard draft save → redirect → persisted Edit hydration, draft-first Variant restriction, and keyboard Media picker entry/dismissal. Media persistence, Variant mutation, activation, reload, and normal delete confirmation remain unverified due empty test assets/master data and unreliable pointer-controller targeting.
- [~] Exercised empty, disabled, keyboard focus, picker dialog, draft, and persisted Edit states. Error/retry, long-content, and responsive-device browser states remain partial.
- [x] Cleaned only isolated Product test fixture `5d043721-31de-4b80-bb27-45a1497b980d` and recorded exact evidence.

## Phase 10 — PR delivery

- [x] Updated this scoped tracker and browser evidence truthfully, including the final keyboard picker, dismissal, and Variant-tab rechecks. PR #6 description now reflects the verified scope and limitations.
- [x] Created conventional commit `ddadddf` and pushed only `feat/lean-v2-admin-integration` to the existing PR #6; the pre-push 118-file / 393-test suite passed.
