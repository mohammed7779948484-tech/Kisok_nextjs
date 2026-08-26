# Frontend layering for Kisok Admin

## Non-negotiable boundary

Presentation components do **not** import Supabase, invoke database clients, or contain query logic. A Feature component consumes a hook or a local data contract; it does not decide how records are fetched or persisted.

## Current local structure

```text
src/
  shared/
    contracts/       # Reusable ListDataContract and ValueDataContract types
    ui/              # Public UI facade: buttons, dialogs, status presentation
  features/<feature>/
    components/      # Rendering and event intent only
    data/            # Local fixture implementation of a contract
    types.ts         # Feature entities and data contract
```

The local UI phase uses synchronous `data/` implementations. Each Feature exposes that implementation through a dedicated `repositories/` boundary, so components are insulated from fixture files and future persistence adapters.

## Refine preparation boundary

Refine Core is prepared as a client-only orchestration runtime under `src/providers/RefineProvider.tsx`. Its resource manifest and non-network deferred data provider live under `src/infrastructure/refine/`. This setup makes the Refine context and Next.js Router binding available without changing the current local panel navigation or allowing any live query.

When a feature receives approved remote CRUD, its own hook will compose the relevant Refine hooks with its Zod schemas and repository contract. This preserves the component rule above: a product, order, or inventory panel renders hook output and dispatches intent; it never imports the Refine data provider or a Supabase client.

## Supabase integration target

When the integration phase is explicitly approved, every feature will gain a focused, separate implementation rather than a shared mega-file:

```text
src/
  infrastructure/supabase/
    client/                         # Browser/server client setup only
    orders/orders.repository.ts     # Supabase implementation for orders
    inventory/inventory.repository.ts
    media/media.repository.ts
  features/orders/
    repositories/                  # Feature-facing repository boundary
    hooks/use-orders.ts             # Query/mutation orchestration
    schemas/orders.schema.ts        # Zod input/output validation
    components/OrdersPanel.tsx      # No Supabase imports
```

`TanStack Query` belongs in feature hooks once the project has real asynchronous reads and mutations. `TanStack Table` belongs only in features that need server-aware sorting, filtering, pagination, selection, or bulk actions. `Zod` belongs at feature input/output boundaries, not as a rendering dependency.

The related Refine and TanStack packages are installed as preparation dependencies. They are not yet active in a feature hook because the workspace remains local until the Supabase schema, credentials, RLS, and role model are explicitly approved.
