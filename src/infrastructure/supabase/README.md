# Supabase infrastructure boundary

This directory is intentionally **non-runtime** during the local UI phase. It contains no client, URL, key, query, or import from `@supabase/supabase-js`.

When the integration phase is explicitly approved, this directory will own only Supabase-specific implementation details:

```text
supabase/
  client/
    browser-client.ts
    server-client.ts
  admin-users/admin-users.repository.ts
  catalog-taxonomy/catalog-taxonomy.repository.ts
  inventory/inventory.repository.ts
  media-library/media-library.repository.ts
  orders/orders.repository.ts
  product-catalog/product-catalog.repository.ts
  store-settings/store-settings.repository.ts
```

Each adapter will implement its corresponding `src/features/<feature>/repositories` contract. Components will continue to consume feature hooks and repositories rather than importing Supabase directly.
