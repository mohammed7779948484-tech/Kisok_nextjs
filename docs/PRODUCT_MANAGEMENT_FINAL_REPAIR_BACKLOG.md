# Product Management — Final Repair Backlog

> Repository: `mohammed7779948484-tech/Kisok_nextjs`  
> PR: `#6 feat/admin: integrate Lean V2 auth and operations`  
> Audited HEAD: `c58ddf0fc872190a5d1e3382b468e4673deb0344`
>
> This backlog consolidates the findings from Rounds 1–5 of the Product Management UX/UI/code audit.
>
> **Explicitly excluded:** all recommendations related to multiple administrators editing the same record at the same time, optimistic concurrency control, stale-version conflict detection, `updated_at` compare-and-swap flows, and similar multi-editor conflict handling. The expected operating model is a small admin environment where a single manager/person normally performs edits.
>
> **Execution order:** `Issue 01 — Searchable + Creatable Option Value Combobox` is the first implementation task. Complete and verify it before moving to the remaining backlog unless inspection discovers a minimal blocking prerequisite.


---

# Issue 01 — Searchable + Creatable Option Value Combobox

**Priority:** P1 — First implementation item  
**Area:** Product Editor / Variant Options / Option Library  
**Severity:** High UX impact  
**Category:** Search / Efficiency / Inline creation

## Why this is first

This is the first requested Product Management improvement to implement.

The current `VariantOptionsDialog` uses a normal Select for Option Type and another normal Select for Option Value. The Option Value list is rendered from the currently selected Option Type's active values.

Current flow:

```text
Select Option Type
→ open Option Value dropdown
→ manually browse the available values
→ choose one
→ Add
```

As the Option Library grows, this becomes inefficient. The intended interaction is:

```text
Select Option Type
→ type 1–2 characters in Option Value field
→ instantly filter matching values
→ select the required value
```

If the value does not exist:

```text
type the new value
→ Create "value"
→ persist it to the shared Option Library
→ automatically select it for the current Variant
→ continue editing without leaving the Variant Options dialog
```

## Verified current implementation

This implementation must follow the existing repository architecture.

### Current Variant Options UI

File:

```text
src/features/product-catalog/components/VariantOptionsDialog.tsx
```

The dialog currently keeps:

```text
pendingTypeId
pendingValueId
```

and derives `pendingType` and `availableValues` from the active Option Types already loaded by the Product Editor.

The existing **Option Type Select can remain a normal Select** for now. The **Option Value Select** is the control that should be replaced.

### Existing Option Value creation path

The project already provides:

```ts
catalogTaxonomyRepository.createOptionValue(...)
```

implemented in:

```text
src/features/catalog-taxonomy/repositories/supabase.ts
```

and declared by the taxonomy contract in:

```text
src/features/catalog-taxonomy/types.ts
```

It creates a real row in `option_values` and returns the created `OptionValueRecord`.

Do not invent a second database write path unless inspection proves a change is required.

### Product Editor references cache

The Product Editor loads Option Types and their nested Option Values through:

```text
src/features/product-catalog/hooks/useProductEditorData.ts
```

using:

```ts
['product-editor', 'references']
```

After a successful inline creation:

1. Use the returned `OptionValueRecord` immediately.
2. Automatically select the new value for the current Variant workflow.
3. Invalidate/refetch `['product-editor', 'references']` in the background so the shared reference cache becomes current.
4. Keep the parent Variant Options dialog open.

Preferred sequence:

```text
create succeeds
→ select returned OptionValueRecord immediately
→ invalidate ['product-editor', 'references']
→ continue editing
```

Do not wait for a full Product Editor refetch before selecting the newly created value.

## Required UI

Replace the current Option Value Select with a reusable searchable/creatable Combobox.

A reasonable component boundary is:

```tsx
<CreatableOptionValueCombobox
  optionType={pendingType}
  value={pendingValueId}
  onValueChange={...}
  onCreated={...}
/>
```

The exact API should be finalized after inspecting existing UI primitives and tests.

Do **not** convert the global shared Select into a searchable control if doing so would change unrelated Select behavior across the application. Prefer a dedicated accessible Combobox component.

## Search behavior

The current Product Editor already loads Option Values as part of its Product Editor references. Therefore the initial implementation should use **client-side filtering**, not a new request on every keystroke.

The search must:

- Filter immediately as the administrator types.
- Be case-insensitive.
- Trim leading/trailing whitespace for matching.
- Prefer exact matches.
- Support partial matching.
- Be useful after the first 1–2 characters.
- Only expose active Option Values for new Variant assignment.
- Preserve keyboard navigation.
- Avoid forcing the administrator to visually scan the complete list once a search term exists.

Example:

```text
Option Type
[ Color ▼ ]

Option Value
[ bl                    ]

Black
Blue
Blue Grey
```

## Inline creation behavior

If no equivalent value exists, show an action such as:

```text
+ Create "Midnight Blue"
```

When activated:

```text
Creating…
```

Then:

1. Validate the text using the existing Option Value validation expectations.
2. Call `catalogTaxonomyRepository.createOptionValue(...)` unless inspection identifies a required shared mutation abstraction already used elsewhere.
3. Persist the value under the currently selected Option Type.
4. Receive the created `OptionValueRecord`.
5. Select the returned value immediately for the current Variant workflow.
6. Invalidate/refetch `['product-editor', 'references']` in the background.
7. Keep `VariantOptionsDialog` open.
8. Allow the administrator to continue configuring other Option Types.

The created value must be a **real reusable shared Option Library value**, not a temporary Variant-only value.

## Duplicate/equivalent value handling

Before displaying Create, compare the normalized input against the current Option Type's existing values.

At minimum normalize for comparison using:

```text
trim()
case-insensitive comparison
```

For example:

```text
Black
black
 BLACK 
```

must not be offered as separate newly creatable values if the application treats them as equivalent.

If an equivalent value exists, expose/select the existing value rather than displaying Create.

Do not add new database constraints or normalization rules without first inspecting the current schema/migrations and existing Option Library behavior.

## Validation

Existing schema:

```text
src/features/catalog-taxonomy/schemas/option-value.schema.ts
```

Preserve the current rules, including:

- Trimmed value.
- Required non-empty text.
- Existing maximum length.

Avoid maintaining incompatible validation rules between Option Library creation and inline Variant creation.

## Active-state behavior

The existing Variant Options UI filters to active Option Values for new assignment. Preserve this behavior.

Because an inline-created value is intended to be immediately usable, verify the actual database/default creation behavior produces an active Option Value. Do not assume it without checking migrations/schema/defaults.

If the existing default is active, preserve it. If inspection proves otherwise, make the smallest deliberate correction required.

## Error behavior

If creation fails:

```text
Could not create "Midnight Blue".
Retry
```

Requirements:

- Preserve the entered text.
- Keep the parent Variant Options dialog open.
- Preserve all other Option selections.
- Expose Retry.
- Do not mark the failed value as selected.
- Do not silently fall back to an empty or successful state.

## Keyboard behavior

The complete interaction must work without a mouse.

Expected behavior:

```text
Type                → filter results
Arrow Up / Down     → move through results
Enter               → select highlighted existing value
Enter               → activate highlighted Create action
Escape              → close the Combobox popup only
Tab                 → move predictably to the next control
```

Pressing Escape while the Combobox popup is open must not accidentally close the parent `VariantOptionsDialog` first.

## Accessibility

Use a real accessible Combobox implementation or an appropriate existing Base UI primitive.

Do not build another incomplete custom ARIA composite widget.

The control must expose:

- Accessible name/label.
- Current selected value.
- Search text.
- Filtered results.
- Highlighted result.
- Create action.
- Creation loading state.
- Creation error/status.

## What should remain unchanged

Unless inspection identifies a direct dependency:

- Keep the existing normal Option Type Select.
- Keep `addSelection(...)` behavior.
- Keep the current final `Save combination` workflow.
- Keep existing Variant combination validation.
- Keep active Option Type filtering.
- Keep active Option Value filtering.
- Do not redesign the entire Option Library.
- Do not introduce server-side search yet unless the actual data scale/loading architecture requires it.
- Do not change unrelated shared Select controls application-wide.

## Tests required

Add focused tests covering at least:

1. Typing filters Option Values.
2. Matching is case-insensitive.
3. Existing exact normalized value does not show Create.
4. Missing value shows Create action.
5. Successful Create uses the current Option Type id.
6. Successful Create uses the existing Option Value creation path.
7. Successful Create automatically selects the returned value.
8. Successful Create invalidates/refreshes Product Editor references.
9. Failed Create preserves input and exposes error/retry.
10. Parent Variant Options dialog remains open after inline creation.
11. Keyboard selection works.
12. Escape closes the Combobox popup without incorrectly closing the parent dialog.
13. Existing Variant Option `Save combination` behavior still works.
14. Existing Option Library create/edit behavior remains unaffected.

## Acceptance criteria

This issue is complete only when:

- Administrator can search Option Values by typing.
- Results filter quickly after the first characters.
- Existing value can be selected by keyboard or pointer.
- Missing value can be created from the same control.
- Created value persists in the shared Option Library.
- Created value is immediately selected for the current Variant workflow.
- No page navigation is required.
- No full Product Editor reload is required.
- Duplicate/equivalent values are not offered for accidental recreation.
- Failed creation preserves the entered text.
- Product Editor reference data is refreshed safely.
- Existing Option Library behavior still works.
- Existing Variant Option save behavior still works.
- No unrelated shared Select behavior is changed.

---

## Goals

The purpose of this repair round is to improve Product Management without rebuilding the feature from scratch.

The implementation should preserve the current architecture where it is already strong:

- Product Editor structure.
- React Hook Form + Zod form architecture.
- Base UI shared dialogs.
- Existing Product readiness/business logic.
- Unsaved Product navigation guard.
- Product draft recovery.
- Inventory audit history model.
- Variant historical-order deletion protection.
- Shared design-system buttons and controls.
- Existing repository/read-model structure unless a specific repair below requires adjustment.

The priorities are:

1. Prevent errors from appearing as valid empty data.
2. Improve Product creation and activation clarity.
3. Improve form accessibility and keyboard behavior.
4. Protect unsaved work inside dialogs.
5. Improve large-data and responsive behavior.
6. Normalize terminology and microcopy.
7. Finish remaining pagination/state polish.

---

# P0 — Must Fix

These should be treated as release blockers for Product Management.

---

## P0-01 — Variant fetch failure must not appear as “No Variants yet”

**Area:** Product Editor / Variants  
**Severity:** High  
**Category:** State integrity / Error handling

### Problem

Variant loading failures can currently collapse into an empty array.

The UI may then render:

> No Variants yet

even though the real condition is:

> Variants could not be loaded.

This converts a technical failure into incorrect business information.

### Affected area

- `src/features/product-catalog/hooks/useProductEditorData.ts`
- `src/features/product-catalog/components/product-editor/ProductEditorPage.tsx`
- `src/features/product-catalog/components/product-editor/ProductVariantsTab.tsx`

### Required behavior

The Variant area must have explicit independent states:

```text
loading
error
ready-empty
ready-with-data
```

### Acceptance criteria

- Request pending → show Variant loading state.
- Request fails → show Variant error message and Retry.
- Request succeeds with zero records → show genuine “No Variants yet”.
- Request succeeds with records → show Variant cards.
- An error must never be converted into `[]` and presented as valid empty data.

---

## P0-02 — Inventory History failure must not appear as empty history

**Area:** Inventory / Adjustment History  
**Severity:** High  
**Category:** State integrity / Audit data

### Problem

`fetchHistory()` currently catches a failure without exposing a history error state.

An unavailable audit trail can therefore appear indistinguishable from:

> No adjustment history records available.

### Affected file

- `src/features/inventory/components/InventoryPanel.tsx`

### Required behavior

Maintain a dedicated:

```text
historyLoading
historyError
historyRows
```

state model.

### Acceptance criteria

- Stock can remain usable if History fails.
- History failure displays a dedicated error.
- Retry must be available for History only.
- An API/database error must never render as genuine empty history.

---

## P0-03 — Variant Media failure must not appear as “0 images”

**Area:** Product Editor / Variant Media  
**Severity:** High  
**Category:** State integrity

### Problem

A failed Variant Media query can fall back to a missing map entry and eventually render a count of `0`.

That incorrectly communicates:

> The Variant has no images.

when the correct state may be:

> Media information is unavailable.

### Affected area

- Product editor data-loading hooks.
- Variant media count mapping.
- `ProductVariantCard.tsx`
- Product Editor Variant tab.

### Required behavior

Media state must distinguish:

```text
Loading…
3 images
0 images
Unavailable
```

### Acceptance criteria

- Media request errors never become zero.
- Retry should be possible where appropriate.
- Variant activation/readiness logic must not treat unavailable media data as confirmed empty data if that data affects eligibility.

---

## P0-04 — Fix Parent Category selector ARIA/keyboard implementation

**Area:** Categories  
**Severity:** High  
**Category:** Accessibility / Keyboard

### Problem

The Parent Category selector declares:

```tsx
role="listbox"
```

with children using:

```tsx
role="option"
```

but it does not implement a complete listbox keyboard interaction model.

There is no robust Arrow Up/Down, Home/End, active-option focus model, or equivalent accessible composite-widget behavior.

### Affected file

- `src/features/catalog-taxonomy/components/CatalogTaxonomyPanel.tsx`

### Required fix

Do **not** maintain a partial custom ARIA listbox.

Prefer one of:

1. A proper Base UI searchable Select/Combobox.
2. A searchable radio-style selector using native/simple semantics.

### Acceptance criteria

Keyboard-only users can:

- Reach the Parent Category control.
- Navigate all available choices.
- Select Root Category.
- Select a Category.
- Understand the currently selected value.
- Exit the control predictably.
- Use the selector without relying on a mouse.

---

## P0-05 — Complete accessible validation relationships for forms

**Area:** Product / Variant / Category / Inventory forms  
**Severity:** High  
**Category:** Accessibility / Forms

### Problem

Many fields display validation text visually without programmatically associating it with the invalid input.

Common missing pieces include:

```text
aria-invalid
aria-describedby
stable error element ids
```

### Affected files include

- `src/features/product-catalog/components/product-editor/ProductBasicsTab.tsx`
- `src/features/product-catalog/components/VariantFormDialog.tsx`
- `src/features/inventory/components/InventoryAdjustmentDialog.tsx`
- Category/Brand/Option form dialogs where applicable.

### Required pattern

For every validated field:

```tsx
<Input
  id="field-id"
  aria-invalid={Boolean(error)}
  aria-describedby={error ? "field-id-error" : undefined}
/>

{error ? (
  <p id="field-id-error" role="alert">
    {error.message}
  </p>
) : null}
```

### Preferred implementation

Create/reuse a shared form-field pattern instead of fixing each field inconsistently.

### Acceptance criteria

- Screen reader can identify invalid inputs.
- The validation message is associated with the field.
- Keyboard submit with errors gives a clear recovery path.
- Visible labels remain present.

---

# P1 — Strongly Recommended

These should ideally be included in the same repair round after P0.

---

## P1-01 — Add a safe Product deactivation workflow

**Area:** Product List  
**Severity:** High  
**Category:** Error prevention / Destructive action

### Problem

An active Product can currently be deactivated directly from the list without a confirmation flow or strong mutation lifecycle feedback.

### Affected file

- `src/features/product-catalog/components/ProductCatalogPanel.tsx`

### Required behavior

Before deactivation:

```text
Deactivate Product?

Customers will no longer see this Product where it is currently available.

Cancel
Deactivate
```

During mutation:

```text
Deactivating…
```

### Acceptance criteria

- Deactivation requires deliberate confirmation.
- The row/action is disabled while working.
- Failure is shown without changing the apparent state.
- Success is clearly communicated.

---

## P1-02 — Make activation dependency state explicit

**Area:** Product Editor / Activation  
**Severity:** Medium–High  
**Category:** State clarity

### Problem

A disabled Product activation control can currently represent several different states:

- Variant data is loading.
- Variant Option data failed.
- Product is not eligible.
- Product is still being evaluated.

The UI does not clearly separate them.

### Affected area

- `ProductBasicsTab.tsx`
- Product Editor workflow.
- Product readiness/visibility panel.

### Required states

```text
Checking readiness…
Ready to activate
Not ready — N issues
Readiness unavailable — Retry
```

### Acceptance criteria

A user can always understand why activation is disabled.

---

## P1-03 — Make Product creation lifecycle visible

**Area:** Product Editor / Create flow  
**Severity:** High UX impact  
**Category:** Workflow clarity

### Current real workflow

```text
Create Product draft
→ Add Variant
→ Configure Options / Media
→ Satisfy readiness
→ Activate Product
```

The UI currently looks more like an ordinary two-tab form.

### Required improvement

Add a lightweight, non-blocking setup/progress indicator.

Example:

```text
Product setup

1. Product details        ✓
2. Add a Variant          ✓
3. Configure Variant      —
4. Activate Product       —
```

This should not become a hard wizard.

### Create CTA

Replace ambiguous:

> Save draft

with a clearer primary action such as:

> Save & add Variants

or:

> Save & continue

A secondary action can be:

> Save draft & close

### Acceptance criteria

A new administrator can understand the next step without already knowing the Product lifecycle.

---

## P1-04 — Standardize Product and Variant lifecycle terminology

**Area:** Product Editor / Product List / Variant cards  
**Severity:** Medium–High  
**Category:** Consistency / Microcopy

### Problem

The UI uses overlapping terms:

```text
Draft
Inactive
Active
Customer visible
Customer hidden
Eligible
Ready
```

Some screens use “Draft” for a Variant state where similar entities use “Inactive”.

### Recommended vocabulary

### Product

```text
Status: Draft / Active
Storefront: Visible / Hidden
```

### Variant

```text
Status: Inactive / Active
Storefront readiness: Ready / Blocked
```

### Example

Instead of:

> Active · Hidden from customers

prefer:

```text
Status: Active
Storefront: Hidden

Reason: No active Variant is currently ready for customers.
```

### Acceptance criteria

The same business state uses the same term across list, editor, readiness panel, Variant cards, and dialogs.

---

## P1-05 — Make Product readiness panel state-aware

**Area:** Product Editor sidebar  
**Severity:** Medium–High  
**Category:** UX / System status

### Problem

The readiness panel can use language such as:

> Complete these items before activation

even when the Product is already active but hidden.

### Required behavior

Use state-specific headings.

### Draft Product

> Complete these items before activation

### Active but hidden

> Fix these items to restore customer visibility

### Active and visible

> Ready and visible to customers

### Acceptance criteria

Readiness text never contradicts the Product's current state.

---

## P1-06 — Protect Variant form from accidental unsaved dismissal

**Area:** Variant create/edit dialog  
**Severity:** Medium–High  
**Category:** User control / Unsaved work

### Problem

Variant Form can be closed by:

- Cancel.
- Dialog X.
- Escape.
- Other dismissal behavior.

without checking whether the form was modified.

### Affected file

- `src/features/product-catalog/components/VariantFormDialog.tsx`

### Required behavior

If form is clean:

```text
close immediately
```

If form is dirty:

```text
Discard unsaved Variant changes?

Keep editing
Discard
```

### Acceptance criteria

Accidental Escape/X cannot silently destroy edited Variant data.

---

## P1-07 — Protect Variant Options dialog from accidental discard

**Area:** Variant Options  
**Severity:** Medium  
**Category:** User control / Unsaved work

### Problem

Option selections are modified locally before Save.

Closing the dialog can discard changes without warning.

### Affected file

- `src/features/product-catalog/components/VariantOptionsDialog.tsx`

### Required behavior

Track whether the combination differs from the original selection.

If dirty, guard dismiss with:

```text
Discard unsaved Option changes?
```

---

## P1-08 — Show an explicit “checking duplicate combination” state

**Area:** Variant Options  
**Severity:** Medium–High  
**Category:** Feedback / Slow network

### Problem

Saving a Variant combination performs additional sibling-combination checks before the final save.

The UI does not clearly expose the intermediate check state.

### Required behavior

Use an explicit state such as:

```text
Checking combination…
Saving…
```

Disable conflicting controls while checking.

### Acceptance criteria

On a slow connection, the user knows the system is checking rather than frozen.

---

## P1-09 — Replace Product Category checkbox wall with searchable multi-select

**Area:** Product Classification  
**Severity:** High scalability impact  
**Category:** Large datasets / Usability

### Problem

The Product Editor currently renders every Category as a checkbox.

This becomes difficult to scan once the catalog contains many Categories.

### Affected file

- `src/features/product-catalog/components/product-editor/ProductClassificationSection.tsx`

### Recommended pattern

```text
Categories

Selected:
[Drinks ×] [Seasonal ×]

Search categories…
□ Coffee
□ Cold drinks
□ Desserts
```

Preserve hierarchy in labels where useful.

### Acceptance criteria

- Existing selected Categories remain visible.
- Categories can be searched quickly.
- Large Category counts do not create an extremely long editor page.

---

## P1-10 — Improve Product search scope copy

**Area:** Product List  
**Severity:** Medium  
**Category:** Discoverability

### Problem

The actual Product search can match more than Product name, including Brand, keywords, SKU, and barcode, but the placeholder only says:

> Search products

### Required copy

Prefer:

> Search product, brand, SKU, or barcode…

### Acceptance criteria

The search field communicates its real capabilities.

---

## P1-11 — Replace ambiguous “Review activation”

**Area:** Product List  
**Severity:** Medium–High  
**Category:** Action clarity

### Problem

The row action:

> Review activation

does not clearly tell the user what will happen.

### Recommended behavior

Use:

> Review readiness

or state-specific labels:

```text
Activate
Fix readiness
Review readiness
```

depending on available state.

---

## P1-12 — Progressive disclosure for Variant title override

**Area:** Variant dialog  
**Severity:** Medium  
**Category:** Progressive disclosure

### Problem

`Title override` is explicitly described as advanced/exception-only but is always shown as a normal field.

### Required behavior

Move it under:

```text
Advanced options
```

or a collapsible section.

### Acceptance criteria

Normal Variant creation focuses on fields used in the standard workflow.

---

## P1-13 — Reduce Variant card action density

**Area:** Variant cards  
**Severity:** Medium  
**Category:** Interaction hierarchy

### Problem

Multiple actions compete visually:

```text
Options
Media
Edit
Delete
```

### Recommended pattern

Keep the most common action(s) visible.

Move secondary/destructive operations into an overflow menu where appropriate.

Example:

```text
Edit
Options
⋯
  Media
  Delete
```

Exact grouping can follow actual operator frequency.

---

# P2 — Important Improvements

These can safely follow the main repair round.

---

## P2-01 — Add Product list filters

**Area:** Product List  
**Category:** Efficiency

Current list primarily provides search.

Useful filters:

```text
Status
Brand
Category
```

Do not add filters that are not operationally useful.

Recommended minimum:

- Active / Inactive.
- Brand.
- Category if Category assignment is commonly used operationally.

---

## P2-02 — Consider bulk actions only when operationally justified

**Area:** Product List  
**Category:** Efficiency

Potential future bulk actions:

```text
Activate
Deactivate
Assign Category
Export
```

However, bulk actions are **not mandatory now**.

Only add them if Product volume/workflows justify the additional complexity.

---

## P2-03 — Create a scan-optimized Product read-only view

**Area:** Product details  
**Category:** Information architecture

Current `show` mode reuses the editor in read-only form.

A future read-only summary would be easier to scan.

Recommended content:

```text
Product status / storefront state
Brand
Categories
Cover image
Description
Variants
SKU / barcode
Inventory summary
```

Primary action:

> Edit Product

This is not a blocker.

---

## P2-04 — Distinguish first-use empty state from search/filter no-results

**Area:** Product List  
**Category:** Empty states

Do not use the same message for:

```text
Catalog truly has no Products
```

and:

```text
No Products match the current search/filter
```

### Example

No Products:

> No Products have been created yet.  
> [Create Product]

Search no results:

> No Products match “sparkling”.  
> [Clear search]

---

## P2-05 — Distinguish Inventory base-empty and filtered-empty states

**Area:** Inventory  
**Category:** Empty states

Differentiate:

```text
No inventory records exist
```

from:

```text
No records match your current filters
```

Use tailored actions such as:

> Clear filters

when appropriate.

---

## P2-06 — Improve Product list loading behavior

**Area:** Product List  
**Category:** Loading states

Current initial loading is primarily a text message.

Recommended:

### Initial load

Use table skeleton/placeholder rows.

### Background refresh

Keep existing table visible and show:

> Refreshing…

Do not blank the list during refresh.

---

## P2-07 — Add visible Refresh working state

**Area:** Product List and similar screens  
**Category:** Feedback

When Refresh is clicked:

```text
Refresh
→ Refreshing…
```

Disable repeated refresh while the same request is running.

---

## P2-08 — Consume Product success URL parameters

**Area:** Product List / Product Editor  
**Category:** Navigation / Feedback

Success notices are read from URL parameters such as:

```text
?toast=created
?toast=updated
```

After consuming the message, clean the URL so a later refresh/back navigation does not replay stale success feedback.

---

## P2-09 — Fix Product Editor success notice dismissal

**Area:** Product Editor  
**Category:** Feedback

The notice can be sourced from either:

```text
workflow.saveMessage
customNotice
```

but dismiss currently clears only `customNotice`.

### Required behavior

All visible Product Editor notices must be dismissible.

Prefer a single notification state or a shared dismiss handler.

---

## P2-10 — Migrate remaining full-page-number pagination to CompactPagination

**Area:** Catalog taxonomy  
**Category:** Large datasets / Responsive

The shared `CompactPagination` already exists.

Migrate remaining Product Management screens that still render every page number, especially:

```text
Brands
Categories
Option Types
```

This prevents pagination from expanding unbounded with large result sets.

---

## P2-11 — Clean up pagination semantics

**Area:** Shared Pagination  
**Category:** Accessibility / Semantics

The current shared pagination renders anchor-style components but handles page transitions as client-side controls.

Choose one model consistently.

### Option A — Client-side control

Use actual buttons.

### Option B — Navigation

Use real anchors with:

```text
?page=2
```

and real `href` values.

Disabled Previous/Next controls should use real disabled behavior where possible rather than only `aria-disabled`.

---

## P2-12 — Visible explanation when search disables reordering

**Area:** Categories / Brands / Option Types  
**Category:** Accessibility / Discoverability

The current reason can depend on a `title` attribute such as:

> Clear search to reorder items

This is weak for keyboard and touch users.

### Required behavior

When search is active, show visible helper text:

> Clear search to change order.

---

## P2-13 — Strengthen selected state in Option Types master/detail navigation

**Area:** Option Library  
**Category:** Navigation / Selection visibility

Current selected row styling is relatively subtle.

Improve with:

- Stronger selected visual indicator.
- `aria-current` or an appropriate selected-state semantic.
- Workspace heading such as:

> Values for: Size

---

## P2-14 — Handle stale selected Option Type when data changes

**Area:** Option Library  
**Category:** State correctness

This is already listed as a known PR follow-up.

If the selected Option Type disappears, becomes unavailable, or is removed after a data refresh, the detail workspace should not retain a stale selection.

### Required behavior

- Select a valid fallback automatically, or
- Clear selection and show an explicit state.

---

## P2-15 — Deterministic Option Value ordering

**Area:** Option Library  
**Category:** Consistency

Also already tracked in the PR.

Option Values should have deterministic ordering so their position does not change unpredictably across reloads.

Use the existing domain ordering field/rule rather than incidental database return order.

---

## P2-16 — Improve Inventory adjustment terminology

**Area:** Inventory  
**Category:** Microcopy

Current adjustment labels are technically accurate but cognitively heavy.

Prefer intent-oriented terms such as:

```text
Receive stock
Correct stock count
Record damaged/expired stock
Other increase
Other decrease
```

Keep the underlying ledger adjustment types unchanged.

---

## P2-17 — Replace Inventory “Review” status with actual condition

**Area:** Inventory Stock table  
**Category:** Status clarity

For low stock, the current pill can show:

> Review

Prefer:

> Low stock

Keep action guidance separate.

Example:

```text
Status: Low stock
Action: Adjust
```

---

## P2-18 — Improve Product/Inventory mobile table behavior

**Area:** Responsive UI  
**Category:** Mobile usability

Tables currently protect layout using horizontal scrolling, which is technically safe but not always ideal on narrow screens.

### Product List

Prefer a mobile card/stacked-row representation:

```text
PRODUCT NAME
Brand
2 Variants · Active

View   Edit   …
```

### Inventory

Horizontal table scrolling is more defensible, but a compact mobile row/card can still improve usability.

Desktop tables should remain unchanged.

---

## P2-19 — Add defensive long-content wrapping

**Area:** Product / Brand / Category / Variant content  
**Category:** Responsive edge cases

Protect against unusually long names, SKU values, barcodes, or unbroken strings.

Useful patterns include:

```text
min-w-0
break-words
overflow-wrap:anywhere
line-clamp-2
max-w-*
```

Avoid layout-breaking unbounded content.

---

## P2-20 — Improve Product readiness terminology around Classification

**Area:** Product Editor  
**Category:** Microcopy consistency

Current Classification guidance can imply Categories are required while readiness may describe Categories as optional.

Align the copy with the actual business rule.

Example if Category is optional:

> Assign a Brand and optionally organize the Product into Categories.

---

## P2-21 — Remove implementation jargon from operator-facing UI

**Area:** Product / Variant / Inventory  
**Category:** Microcopy

Reduce unnecessary user-facing references to internal implementation terms such as:

```text
Lean V2
hosted data
immutable ledger
```

Use operational language instead.

### Example

Instead of:

> Lean V2 protects this Variant from deletion.

Use:

> This Variant appears in historical Orders and cannot be permanently deleted.

Keep implementation terminology in documentation, diagnostics, or developer logs.

---

## P2-22 — Lightweight offline state

**Area:** Admin UI  
**Category:** Network resilience

Do **not** implement offline-first synchronization.

A simple operator-facing state is enough:

> You’re offline. Changes cannot be saved.

Recommended:

- Listen to browser online/offline state.
- Disable writes when explicitly offline.
- Refetch when connectivity returns.

---

# P3 — Polish / Verification

---

## P3-01 — Product and Variant capitalization consistency

Normalize casing across:

```text
Create Product
Save Product
Product name
Add Variant
Save Variant
Option Values
No Variants yet
```

Prefer one writing standard, ideally sentence case for normal UI controls/headings unless a specific entity naming convention requires otherwise.

---

## P3-02 — Success toast duration

Inventory success notification currently auto-dismisses relatively quickly.

Consider:

```text
6–8 seconds
```

or persistence until the next meaningful interaction.

Errors should not auto-dismiss.

---

## P3-03 — Browser verification for dialog focus behavior

The shared Base UI dialog foundation is strong, but the following must be browser-tested:

- Initial focus.
- Focus trapping.
- Escape.
- Return focus after close.
- Nested Media Picker focus behavior.
- Only the topmost dialog closes on Escape.
- Background dialogs are not keyboard-interactive.

No dialog rewrite is required unless these tests reveal an actual failure.

---

## P3-04 — Browser verification at 200% / 400% zoom

Verify:

- Product Editor.
- Product List.
- Categories.
- Options.
- Inventory.
- Variant dialogs.
- Media dialogs.

Check that content remains usable without clipped controls or inaccessible information.

---

## P3-05 — Narrow viewport verification

Test at least:

```text
320px
360px
375px
768px
```

Verify:

- Header actions wrap correctly.
- Dialogs remain usable.
- Tables do not break the entire page.
- Search/filter controls remain reachable.
- Long content does not create page-level overflow.

---

## P3-06 — Screen-reader verification

Test at minimum:

- Product name validation.
- Variant validation.
- Inventory adjustment validation.
- Status messages.
- Error alerts.
- Dialog title/description announcements.
- Parent Category selection after the semantic fix.

---

## P3-07 — Contrast verification

Static code review cannot certify color contrast.

Verify rendered combinations for:

```text
muted text
warning text
destructive text
success text
StatusPill variants
focus rings
disabled controls
dark mode
```

Target WCAG 2.2 AA.

---

## P3-08 — Reduced-motion verification

The UI already uses `motion-safe` in some places.

Confirm important status/interaction feedback does not depend on animation and remains understandable with reduced motion enabled.

---

# Product Management — Recommended UX Model

The existing architecture should remain, but the operator-facing workflow should become clearer.

## Product lifecycle

```text
Create draft
↓
Add Variant
↓
Configure Variant Options / Media
↓
Review readiness
↓
Activate Product
↓
Visible to customers when eligible
```

This should be visible in the Product Editor without forcing the administrator into a rigid wizard.

---

# Recommended terminology

## Product

```text
Status: Draft / Active
Storefront: Visible / Hidden
```

## Variant

```text
Status: Inactive / Active
Storefront readiness: Ready / Blocked
```

## Inventory

```text
Healthy
Low stock
Out of stock
```

Avoid action words such as “Review” as a status.

---

# State Model Rules

These should become project-wide rules.

## Never collapse error into empty

Bad:

```text
request fails
→ []
→ No records
```

Correct:

```text
loading
error
ready-empty
ready-with-data
```

Apply to:

- Products.
- Variants.
- Variant Media.
- Variant Option values.
- Categories.
- Brands.
- Inventory.
- Inventory History.
- Media library.

---

## Background refresh should preserve useful data

Bad:

```text
Refresh
→ entire table disappears
→ Loading…
```

Preferred:

```text
existing data remains
+ Refreshing…
```

Initial load can use skeletons.

---

## Destructive action rules

Operations such as:

```text
Deactivate
Delete
Remove permanent data
```

must provide:

- Clear destructive wording.
- Confirmation when impact is meaningful.
- Pending state.
- Error state.
- Success state.

---

## Dialog dirty-state rules

All edit/create dialogs that hold unsaved local state should use:

```text
clean → close immediately
dirty → confirm discard
```

Do not show discard confirmation when nothing changed.

---

# Large Dataset Rules

Avoid unbounded UI patterns.

## Pagination

Use shared compact pagination.

Do not render:

```tsx
Array.from({ length: totalPages })
```

for potentially large datasets.

## Category assignment

Do not render hundreds of Category checkboxes.

Use searchable selection.

## Product/Brand selectors

If a dataset becomes large, switch to searchable combobox patterns rather than extremely long select menus.

---

# Responsive Rules

- Preserve current responsive panel spacing.
- Preserve shared button touch sizing.
- Keep dialogs bounded to viewport height.
- Avoid page-level horizontal overflow.
- Use mobile stacked rows/cards where a desktop table becomes cumbersome.
- Add defensive text wrapping for long entity names and identifiers.

---

# Accessibility Rules

Every form field must have:

```text
visible label
programmatic accessible name
aria-invalid when invalid
aria-describedby for help/error text
```

Every async status should use appropriate semantics such as:

```text
role="status"
aria-live="polite"
```

for non-critical updates.

Errors should use an appropriate alert pattern.

Custom composite widgets must either:

- implement their declared ARIA pattern completely, or
- use simpler native semantics.

---

# Suggested Implementation Order

## Phase A — First requested UX improvement

1. Searchable + Creatable Option Value Combobox.

## Phase B — Correctness states

2. Variant error vs empty.
3. Inventory History error vs empty.
4. Variant Media error vs zero.
5. Activation readiness loading/error distinction.

## Phase C — Accessibility

6. Parent Category selector.
7. Shared form error relationships.
8. Pagination semantics.
9. Reorder-disabled explanation.

## Phase D — Destructive / unsaved protection

10. Product deactivation confirmation.
11. Variant Form dirty guard.
12. Variant Options dirty guard.

## Phase E — Product workflow clarity

13. Product setup progress.
14. Create CTA wording.
15. Lifecycle terminology.
16. State-aware readiness copy.
17. Review readiness action.

## Phase F — Scale

18. Searchable Product Category selector.
19. Compact pagination on remaining taxonomy screens.
20. Stale Option Type selection fix.
21. Deterministic Option Value ordering.

## Phase G — Responsive and polish

22. Product/mobile list layout.
23. Long-name wrapping.
24. Loading skeleton/background refresh.
25. Refresh working states.
26. URL flash cleanup.
27. Notification dismissal cleanup.
28. Inventory terminology.
29. Remove Lean V2 implementation jargon.
30. Lightweight offline state.

## Phase H — Browser QA

31. Keyboard-only.
32. Nested dialog focus.
33. Screen reader.
34. 200%/400% zoom.
35. 320px/360px/375px widths.
36. Light/dark contrast.
37. Reduced motion.
38. Slow-network behavior.

---

# Definition of Done

Product Management repair work should not be considered complete until the following are true:

- Variant errors never render as empty Variant lists.
- Inventory History errors never render as empty audit history.
- Variant Media errors never render as zero Media.
- Product activation always communicates loading/error/blocked/ready clearly.
- Parent Category selection is fully keyboard accessible.
- Validation errors are programmatically associated with fields.
- Product deactivation has explicit confirmation and mutation feedback.
- Dirty Variant dialogs cannot be accidentally dismissed.
- Product creation visibly explains the next workflow step.
- Product/Variant lifecycle vocabulary is consistent.
- Category assignment remains usable with a large number of Categories.
- Variant Option Values can be searched quickly; a missing value can be created inline, persisted to the shared Option Library, selected immediately, and reused later.
- Variant Option Values can be searched quickly and missing values can be created inline, persisted to the Option Library, and automatically selected.
- Remaining taxonomy pagination is compact/bounded.
- Product list and editor behave acceptably on narrow screens.
- Long names and identifiers do not break layout.
- Browser accessibility verification is completed after the code changes.
- Slow-network behavior is verified.
- The latest hosted/browser QA evidence reflects the repaired code, not an older PR snapshot.

---

# Explicit Non-Goals

The following should **not** be added as part of this repair backlog:

- Multi-admin simultaneous-edit conflict detection.
- Optimistic concurrency control for two administrators editing the same Product.
- `updated_at` compare-and-swap update flows for administrator conflicts.
- Product edit conflict/merge UI.
- Inventory conflict warnings caused specifically by two simultaneous administrators.
- Variant Option concurrency protection specifically for two administrators racing the same configuration.
- Offline-first synchronization.
- Redux/global-state rewrite.
- Product Management rewrite from scratch.
- Mandatory step-by-step wizard.
- New microservices.
- Event bus/message broker.
- Virtualization everywhere.
- New design system.
- Replacing the existing Base UI Dialog system without a demonstrated browser bug.

---

# Final Recommendation

The Product Management feature should be improved surgically rather than redesigned.

Its core architecture is already strong enough to keep.

The main repair round should focus on:

```text
state correctness
+ accessibility
+ unsaved-work protection
+ lifecycle clarity
+ large-data usability
+ responsive polish
```

Once the P0 and P1 items are complete and browser QA is repeated against the repaired HEAD, Product Management should be in a substantially stronger production-ready state without unnecessary architectural expansion.
