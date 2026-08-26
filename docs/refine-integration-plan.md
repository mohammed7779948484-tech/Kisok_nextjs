# Refine integration plan for Kisok Admin

## Chosen architecture

Kisok will use **headless Refine Core** as the CRUD orchestration runtime. `RootProvider` remains the app-level owner of Redux, theme, `next-intl`, and shadcn tooltip context. A new client-only `RefineProvider` will be nested below it and will host `<Refine>`, the Next.js router binding, a resource manifest, and a deliberately non-network data provider while persistence is deferred.

> Presentation components keep their current rule: they receive data and action state from a feature hook; they do not import a Supabase client, a Refine provider, or database code.

| Layer | New responsibility | Prohibited responsibility |
| --- | --- | --- |
| `src/providers/RefineProvider.tsx` | Mount `Refine`, TanStack Query-backed runtime, and router binding in a client boundary. | Business rules, component layout, or direct Supabase setup. |
| `src/infrastructure/refine/resources.ts` | Declare stable resource names and future action-path templates. | Render pages or own feature mutations. |
| `src/infrastructure/refine/deferred-data-provider.ts` | Provide a safe non-network data-provider contract before integration. | Return fixtures as if they were production data or make HTTP calls. |
| `src/infrastructure/supabase/<feature>/` | Later host feature-scoped query mappings and Supabase adaptation. | Be imported by presentation components. |
| `src/features/<feature>/hooks/` | Compose Refine hooks, Zod parsing, repository interfaces, and status mapping. | Reach through to UI primitives or hard-code SQL/RLS rules. |
| `src/features/<feature>/components/` | Render Kisok’s shadcn-based CRUD layout and send user intent. | Import Refine data providers, Supabase clients, or auth secrets. |

## Resource and routing model

The first resource manifest will name the existing feature domains without replacing the current local panel navigation. The resource action paths are placeholders for a later route migration under the existing locale segment:

| Refine resource | Feature owner | Future localized action paths |
| --- | --- | --- |
| `products` | `product-catalog` | `/{locale}/admin/products`, `/create`, `/edit/:id`, `/show/:id` |
| `orders` | `orders` | `/{locale}/admin/orders`, `/show/:id` |
| `inventory-adjustments` | `inventory` | `/{locale}/admin/inventory-adjustments`, `/create` |
| `catalog-taxonomy` | `catalog-taxonomy` | `/{locale}/admin/catalog`, `/create`, `/edit/:id` |
| `media-assets` | `media-library` | `/{locale}/admin/media`, `/show/:id` |
| `operators` | `admin-users` | `/{locale}/admin/users`, `/show/:id` |
| `store-settings` | `store-settings` | `/{locale}/admin/settings`, `/edit/:id` |

Refine uses colon route parameters such as `:id`, while Next uses bracketed folder parameters such as `[id]`; its official router binding resolves that difference. The actual route files will be introduced per feature only after the Supabase schema and accepted CRUD scope exist. [1]

## Controlled installation set

The setup will install the packages below through `pnpm` from the repository root, without a code generator and without a Supabase project connection.

| Dependency | Use in Kisok | Enable now |
| --- | --- | --- |
| `@refinedev/core` | `<Refine>`, providers, resources, and CRUD hooks. | Yes |
| `@tanstack/react-query` | Required Refine peer and cache lifecycle. | Yes |
| `@refinedev/nextjs-router` | App Router binding for future resource routes. | Yes |
| `@refinedev/react-table`, `@tanstack/react-table` | Real list-page sorting/filtering/pagination after server data exists. | Yes, package only |
| `@refinedev/react-hook-form`, `react-hook-form` | Create/edit workflows with Zod schemas. | Yes, package only |
| `@refinedev/supabase`, `@supabase/supabase-js` | Provider/client bridge to be activated in a later Supabase phase. | Yes, no configuration |

The project will **not** use `create refine-app`, Refine Inferencer, example demo data, prefilled Supabase credentials, permissive RLS policies, or a Refine-generated application layout. Those shortcuts would conflict with the existing next-maker project, Kisok visual system, and security boundary. [2] [3]

## shadcn component policy

The official shadcn command supports an all-components installation. Kisok will use it in non-overwrite mode after a dry run, so it adds every missing official registry component and dependency without replacing the already-customized Base UI source files. The design system remains token-first: `globals.css` semantic variables and Kisok variants are the customization authority. [4] [5]

Refine's optional shadcn registry will not be bulk-applied because it targets Radix-oriented generated files while the current official Kisok registry uses Base UI. Instead, Refine performs data orchestration and Kisok uses its own official shadcn source files for visual views, forms, buttons, and tables. A Refine registry file can be selectively evaluated only when it adds a reusable headless-compatible pattern without conflicting primitives. [3]

## Deferred Supabase activation sequence

1. Request project URL and publishable key through the approved secret flow; never place these values in source.
2. Establish tables, foreign keys, audit fields, RLS, and role policies before exposing any Refine resource.
3. Replace `deferredDataProvider` with a Supabase provider bridge, then map each resource to a separately tested feature adapter.
4. Implement `authProvider` and `accessControlProvider` from the approved Kisok admin roles; do not use the quickstart's anonymous write policies.
5. Add per-feature `useList`, `useOne`, `useCreate`, `useUpdate`, and `useDelete` hooks, Zod schemas, and the relevant Kisok shadcn CRUD screens.
6. Activate realtime/live behavior only for resources that have a defined operational need, audit semantics, and RLS coverage.

## Validation contract

The preparation stage must prove that the provider renders without network access, resources are deterministic, existing local workflows remain unchanged, and the feature-component Supabase boundary still holds. Each provider/manifest behavior is added test-first, then verified by TypeScript, Biome, Vitest, and the Next production build on Node.js 24+.

## Sources

[1]: https://refine.dev/core/docs/routing/integrations/next-js/ "Refine Next.js router"
[2]: https://refine.dev/core/docs/guides-concepts/usage-with-existing-projects/ "Refine in existing projects"
[3]: https://refine.dev/core/docs/ui-integrations/shadcn/introduction/ "Refine shadcn/ui integration"
[4]: https://ui.shadcn.com/docs/cli "shadcn CLI"
[5]: https://ui.shadcn.com/docs/theming "shadcn theming"
