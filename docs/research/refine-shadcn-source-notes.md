# Refine and shadcn research notes

## shadcn/ui registry

The official shadcn CLI exposes `add --all` to add every currently available registry component, as well as a dry-run mode to inspect the change set before writing files. The local dry run reports 62 component files and nine dependencies, including 13 existing component files that would be overwritten if `--overwrite` were used. The integration must therefore add the missing components without overwriting the Kisok-customized files, especially `button.tsx` and its `quiet` variant. [1]

shadcn is an open-code distribution system rather than a closed component package. Its CSS-variable theme model is compatible with Kisok because semantic tokens are intentionally designed to be overridden in `globals.css`, including paired foreground tokens, sidebar tokens, chart tokens, and a base radius token. [2]

## Refine packages and compatibility signals

The currently published peer dependencies identify a compatible client-side baseline: `@refinedev/core` 5.0.12 supports React 18 or 19 and requires TanStack Query 5; `@refinedev/nextjs-router` 7.0.5 peers with Refine Core 5, Next, and React 18 or 19; `@refinedev/supabase` 6.0.2 peers with Refine Core 5 and `@supabase/supabase-js` 2; and `@refinedev/react-table` 6.0.1 peers with Refine Core 5 and TanStack Table 8.

Refine documents a Next.js router binding, a shadcn/ui registry integration, and a Supabase data provider. Its public guidance also presents adding Refine to an existing project as a supported path, rather than requiring a generated Refine application. [3] [4] [5]

Browser review of the official pages confirms that the Next.js binding is supplied by `@refinedev/nextjs-router` and intended for resource action routes in the `app` directory. The shadcn integration is likewise a source-code registry integration: it is designed to layer CRUD views, forms, data tables, and action components over Refine hooks while keeping the component code in the application. This means the provider and hooks must live in a client boundary, while the existing server layout and feature components stay free to preserve their current responsibilities. [3] [4]

## Security and architecture implications

The Supabase quickstart is intentionally educational: it warns that its permissive anonymous write policies are not suitable for production and instructs teams to scope writes to authenticated users. Kisok must therefore preserve feature-owned repositories, keep Supabase clients out of presentation components, and implement row-level security and role policies before enabling any real Refine resource writes. [6]

## Sources

[1]: https://ui.shadcn.com/docs/cli "shadcn CLI"
[2]: https://ui.shadcn.com/docs/theming "shadcn Theming"
[3]: https://refine.dev/core/docs/routing/integrations/next-js/ "Refine Next.js integration"
[4]: https://refine.dev/core/docs/ui-integrations/shadcn/introduction/ "Refine shadcn/ui integration"
[5]: https://refine.dev/core/docs/guides-concepts/usage-with-existing-projects/ "Using Refine with existing projects"
[6]: https://supabase.com/docs/guides/getting-started/quickstarts/refine "Supabase with Refine"
