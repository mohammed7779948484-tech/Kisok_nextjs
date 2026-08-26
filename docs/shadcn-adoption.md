# shadcn/ui adoption in Kisok Admin

## Decision and boundary

Kisok Admin keeps the **@teispace/next-maker** application structure, feature-first ownership, shared contracts, and per-feature repositories. The dashboard now takes its interaction primitives from the official **shadcn/ui** registry generated with the `base-nova` style. The implementation does not create replacement Button, Dialog, Badge, Input, Textarea, Table, or Tooltip primitives by hand.

## Generated registry components

The generated component set currently includes `button`, `dialog`, `alert-dialog`, `badge`, `input`, `textarea`, `select`, `table`, `skeleton`, `tooltip`, `sheet`, `separator`, and `dropdown-menu`. Generated source remains under `src/components/ui`; it is customized only through variants, semantic tokens, and composition.

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
| TanStack Query | Deferred | No remote query or mutation lifecycle exists yet; add feature-owned hooks when Supabase reads and writes begin. |
| TanStack Table | Deferred | The current product list has no real sorting, filtering, pagination, selection, or bulk-action requirement. |

## Visual verification

Desktop and mobile full-page previews were reviewed after token adoption. Both display the intended dark charcoal / off-white hierarchy, preserve readable mono metadata and headings, and retain the responsive compact navigation and stacked operational panels on mobile. This verification concerns visual layout; existing automated interaction tests remain the source of evidence for local workflow behavior.
