# Refine compatibility assessment for Kisok Admin

## Recommendation

**Adopt Refine Core, conditionally.** It is a strong fit for Kisok's upcoming data-heavy administration work because its resource model, TanStack Query lifecycle, route bindings, mutation modes, authentication and access-control contracts reduce CRUD orchestration without requiring a visual component library. Refine Core 5 supports the project’s React 19 baseline, while the published Next.js router package peers with Refine Core 5 and Next. [1] [2]

The decision is deliberately **not** to replace the Kisok shell, providers, `next-intl` route segment, Redux setup, repositories, or shadcn source components. Refine will own generic CRUD state and resource operations only; Kisok continues to own visual composition, language direction, feature boundaries, validation schemas, and business rules.

## Fit against the current architecture

| Existing Kisok decision | Refine role | Compatibility decision |
| --- | --- | --- |
| Next.js App Router with a locale segment | Add Refine inside a client provider below `RootProvider`; keep route ownership in Next and `next-intl`. | Compatible, with a locale-aware resource route map. |
| Feature-first `components` / `repositories` / `hooks` | Put Refine hooks in `features/<feature>/hooks`; keep presentation components free of provider and client imports. | Compatible and required. |
| Supabase is deferred and distributed by feature | Use a future Supabase-backed Refine data-provider bridge from `infrastructure/refine`, then delegate feature-specific business invariants to per-feature repositories. | Compatible, but not enabled until credentials, schemas, RLS, and roles are approved. |
| shadcn `base-nova` with Base UI and Kisok custom variants | Use Kisok’s official generated shadcn components directly around headless Refine hooks. | Compatible. Do **not** overwrite current components. |
| Strict local UI phase | Register an empty/deferred Refine resource manifest and a non-network provider only. | Compatible and safe. |

## Important constraint: Refine-shadcn registry versus Kisok shadcn base

Refine's official shadcn registry offers reusable CRUD views, forms, tables, buttons, layout, auth, and notification components. Its documentation describes those files as source-code additions and states that the integration is built on Radix UI primitives. [3] The Kisok shadcn setup was generated with the **Base UI** `base-nova` registry. The Refine registry must therefore be treated as an optional reference/source layer, not applied wholesale: it could introduce Radix-oriented source beside Base UI and would overwrite existing generated files if used with a forceful full-registry command.

The official shadcn CLI does support `add --all`, but the completed dry run for this project shows 62 component files, nine dependencies, and 13 overwrite candidates. The safe action is to add every **missing** official shadcn component without `--overwrite`, preserve the already-customized files, and keep the Kisok design tokens as the single theming source. [4] [5]

## Recommended package set

| Package | Introduce now | Purpose |
| --- | --- | --- |
| `@refinedev/core` | Yes | Headless resource, mutation, auth, access-control, and data-provider contracts. |
| `@tanstack/react-query` | Yes | Required peer dependency and Refine query cache/runtime. |
| `@refinedev/nextjs-router` | Yes | Router binding for future App Router CRUD resource paths. |
| `@refinedev/react-table`, `@tanstack/react-table` | Yes | Future server-aware list pages only; no conversion of current simple local table yet. |
| `@refinedev/react-hook-form`, `react-hook-form` | Yes | Refine-backed create/edit forms with existing Zod schemas. |
| `@refinedev/supabase`, `@supabase/supabase-js` | Install but do not configure | Future provider/client implementation; no credentials or network requests in this stage. |
| Refine shadcn registry views | Not as a bulk install | Selectively inspect or import only when a Base UI-compatible CRUD surface is justified. |

## Non-negotiable rules for implementation

1. `src/features/*/components` must not import Refine data providers, Supabase clients, or database code.
2. `src/infrastructure/refine` owns only cross-feature provider composition and resource metadata; it must not become a feature mega-repository.
3. `src/infrastructure/supabase/<feature>` owns table/query adaptation; `features/<feature>/hooks` owns Refine hook orchestration and Zod boundary validation.
4. `authProvider`, `accessControlProvider`, and any live provider stay deferred until the actual Supabase auth/RLS model is approved.
5. No Refine Inferencer or demo policy may be used in production paths. Supabase's own quickstart warns that its anonymous write policies are for demonstration and must be replaced with authenticated rules. [6]

## Sources

[1]: https://www.npmjs.com/package/@refinedev/core "@refinedev/core package metadata"
[2]: https://www.npmjs.com/package/@refinedev/nextjs-router "@refinedev/nextjs-router package metadata"
[3]: https://refine.dev/core/docs/ui-integrations/shadcn/introduction/ "Refine shadcn/ui integration"
[4]: https://ui.shadcn.com/docs/cli "shadcn CLI"
[5]: https://ui.shadcn.com/docs/theming "shadcn theming"
[6]: https://supabase.com/docs/guides/getting-started/quickstarts/refine "Supabase and Refine quickstart"
