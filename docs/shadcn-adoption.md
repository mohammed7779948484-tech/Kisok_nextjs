# shadcn/ui adoption in Kisok Admin

## Decision and boundary

Kisok Admin keeps the **@teispace/next-maker** application structure, feature-first ownership, shared contracts, and per-feature repositories. The dashboard now takes its interaction primitives from the official **shadcn/ui** registry generated with the `base-nova` style. The implementation does not create replacement Button, Dialog, Badge, Input, Textarea, Table, or Tooltip primitives by hand.

## Generated registry components

The full official `base-nova` registry set is now present in `src/components/ui` (**62 component files**). The registry run created the 49 missing files and deliberately skipped the nine existing files instead of overwriting Kisok customizations. This preserves the official `Button` source and its `quiet` variant while keeping every official component ready for feature adoption.

| Component family | Official components available |
| --- | --- |
| Actions and feedback | `alert`, `alert-dialog`, `badge`, `button`, `button-group`, `progress`, `skeleton`, `spinner`, `toast`, `tooltip` |
| Layout and navigation | `accordion`, `breadcrumb`, `collapsible`, `menubar`, `navigation-menu`, `pagination`, `resizable`, `scroll-area`, `separator`, `sheet`, `sidebar`, `tabs` |
| Overlays and menus | `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `hover-card`, `popover` |
| Fields and forms | `checkbox`, `combobox`, `field`, `input`, `input-group`, `input-otp`, `label`, `native-select`, `radio-group`, `select`, `slider`, `switch`, `textarea`, `toggle`, `toggle-group` |
| Data and rich surfaces | `aspect-ratio`, `attachment`, `avatar`, `bubble`, `calendar`, `card`, `carousel`, `chart`, `empty`, `item`, `kbd`, `marker`, `message`, `message-scroller`, `questionnaire`, `table` |

| Surface | Official primitive | Kisok customization |
| --- | --- | --- |
| Operational actions and navigation | `Button` | Compatibility export as `KisokButton`, a `quiet` operational variant، and usage in feature actions, navigation, header state controls, and the local access gate. |
| Local dialogs | `Dialog` | Compatibility exports preserve existing feature boundaries and controlled dialog flows. |
| Status signals | `Badge` | `StatusPill` is a thin composition over `Badge`, with mono label treatment and square industrial edges. |
| Settings and local notes | `Input`, `Textarea` | Re-exported from shared UI and used by the settings, inventory, and orders feature dialogs. |
| Product list | `Table` and table subcomponents | Used by the product-catalog feature while repository ownership remains unchanged. |
| Global interaction context | `TooltipProvider` | Installed in `RootProvider` for future tooltips. |

## Kisok visual tokens

The theme uses shadcn semantic CSS variables in `src/styles/globals.css`. The `.dark` values use charcoal surfaces, off-white foregrounds, neutral gray borders, square radius, and a reserved destructive signal. `CustomThemeProvider` defaults to the dark class to avoid system-theme shifts away from the Kisok industrial direction.

## Deliberate deferrals

| Item | Status | Rationale |
| --- | --- | --- |
| Supabase authentication and data adapters | Deferred | The current workspace remains local by product decision; view components do not import Supabase. |
| Cloudinary upload flow | Deferred | Media actions remain local buffers until integration is explicitly approved. |
| Refine Core, Next.js Router, React Hook Form, TanStack Query and Table | Prepared, not active for live CRUD | Installed behind a client-only `RefineProvider`, deferred data provider, and resource manifest. No current local panel issues a Refine query or mutation. |
| Supabase data provider | Installed, not configured | `@refinedev/supabase` and `@supabase/supabase-js` are package-only preparation; no URL, key, client initialization, request, or RLS policy has been added. |
| Refine shadcn registry views | Deferred selectively | Refine's registry is Radix-oriented while Kisok uses the official Base UI `base-nova` source. Kisok therefore uses headless Refine orchestration around its own shadcn components rather than bulk-overwriting primitives. |

## Visual verification

Desktop and mobile full-page previews were reviewed after token adoption. Both display the intended dark charcoal / off-white hierarchy, preserve readable mono metadata and headings, and retain the responsive compact navigation and stacked operational panels on mobile. This verification concerns visual layout; existing automated interaction tests remain the source of evidence for local workflow behavior.
