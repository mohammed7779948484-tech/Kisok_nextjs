# next-shadcn-dashboard-starter: adoption assessment

## Reference reviewed

- Repository: https://github.com/Kiranism/next-shadcn-dashboard-starter
- License: MIT (as declared by the repository)
- Reference snapshot inspected: August 26, 2026

## Useful design-system material

The reference uses **Next.js 16**, **TypeScript**, **Tailwind CSS v4**, and a shadcn component layer built on **Base UI**. Its strongest reusable UI patterns are its composable form controls, dialog and sheet flows, table affordances, command/search patterns, feedback states, and token-led component conventions.

Kisok can adopt selected presentation components and interaction patterns where they match the current local admin UI. The existing monochrome industrial visual direction remains the product-specific theme; it should not be replaced by the reference template's visual identity.

## Explicit compatibility boundary

Kisok remains a **next-maker** project. The following are out of scope for this adoption pass because they would replace or duplicate the established project foundation:

- The reference's Bun toolchain and formatter/linter setup.
- Clerk authentication, Sentry, billing, and SaaS-specific application flows.
- TanStack Query, React Table, React Form, Nuqs, DnD, charts, and other data/application libraries until an approved feature has a concrete need.
- Any route, provider, project config, package-manager, or generator change that weakens the Node.js 24 + pnpm + Feature-first conventions already established in Kisok.

## Candidate first additions

1. Shared semantic primitives for button, badge/status, empty state, and local feedback.
2. A consistent dialog/sheet contract for future product drafts, stock adjustments, cancellation reasons, media deletion warnings, and user-impact confirmations.
3. Selectable data-table building blocks only when the local product, inventory, or orders workspaces need filtering or bulk actions.

## Reference implementation patterns retained

The inspected reference exposes buttons through a small `variant` and `size` contract, based on Base UI's native button primitive, rather than placing long class strings on every feature. Its dialog contract uses Base UI's Root, Trigger, Backdrop, Portal, Popup, Title, Description, and Close primitives. Kisok will adapt these two patterns with its own sharp-cornered monochrome tokens and accessibility labels, rather than copying the reference's full component set or visual skin.

## Decision rule

Each addition must satisfy a real Kisok interaction, preserve the existing local-first data boundary, enter through a shared design-system layer, and pass the existing Biome, TypeScript, Vitest, and production-build gate.
