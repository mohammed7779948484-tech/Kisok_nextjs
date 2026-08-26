# Kisok Admin → next-maker Feature Map

## Scope and evidence

The current `kisok_admin` application has nine routed operational areas: Dashboard, Brands, Categories, Products, Media, Inventory, Orders, Users, and Store Settings. The application is a React 19 + Vite + Refine dashboard with Supabase Auth, Supabase tables/RPCs, a Supabase Edge Function for administrative users, and Cloudinary for media.

The source project passed its available verification commands after dependencies were installed: `npm test` passed with 12 tests, `npm run typecheck` passed, and `npm run build` passed. The migration should therefore preserve behavior rather than redesign business rules from assumptions.

## Recommended feature count

Build **9 business Features** in `@teispace/next-maker`. This groups Brands and Categories into one bounded **Catalog Taxonomy** Feature because the current application already implements both using the same UI shell, deactivation-impact behavior, media-picker flow, and shared visibility rules.

| # | next-maker Feature | Current scope retained | Supabase / Cloudinary dependency | Priority |
|---:|---|---|---|---|
| 1 | `auth-admin-access` | Password login, persistent session, active-admin gate, logout, role-aware access | Supabase Auth; `current_active_profile` | P0 |
| 2 | `admin-users` | Searchable list, create, edit profile/role, password update, deactivate/reactivate | Supabase Edge Function `admin-users`; `admin_update_profile` | P0 |
| 3 | `media-library` | Upload, register, list, select, copy URL, safe delete with usage protection | Cloudinary Upload Widget/API; `media_assets`; `get_media_asset_usage` | P1 |
| 4 | `catalog-taxonomy` | Brands and nested categories; order, activation, images, child-category creation, deactivation impact | `brands`, `categories`, `create_child_category` | P1 |
| 5 | `product-catalog` | Products, category mapping, flavors, images, search keywords, activation, preview, initial stock, visibility validation | `products`, `product_categories`, `flavors`, `save_product_catalog`, `set_product_active` | P1 |
| 6 | `inventory` | Current quantities, low-stock classification, adjust/set workflows, immutable adjustment history | `inventory`, `inventory_adjustments`, `apply_inventory_adjustment`, `set_inventory_quantity` | P1 |
| 7 | `orders` | Queue, URL filters, 15-second refresh, detail drawer, completion, cancellation with reason and stock restoration | `orders`, `order_items`, `complete_order`, `cancel_order` | P1 |
| 8 | `dashboard-operations` | Operational metrics, low-stock queue, recent orders and inventory audit activity | Catalog visibility, inventory, orders, settings, adjustments | P2 |
| 9 | `store-settings` | Store name, logo, timezone, low-stock threshold, success reset configuration | `store_settings`; Media Library selection | P2 |

## What is deliberately not a separate Feature

`flavors` remain inside `product-catalog`, because flavors are created, edited, activated, image-selected, and stock-initialized within the product editor. `inventory-adjustments` remain inside `inventory`, because they are the audit record of its adjustment operations. Catalog visibility is a shared catalog rule used by products and the dashboard; it belongs to `catalog-taxonomy` as a service/domain helper, not to a separate page Feature.

The Next.js application shell, RTL theme, navigation, DataTable, state components, Supabase client adapter, Cloudinary adapter, error mapping, date/time utilities, and notifications are **shared platform modules**. They must be built once but are not counted as business Features.

## Data and integration inventory

| Type | Items to preserve |
|---|---|
| Supabase tables/resources | `profiles`, `brands`, `categories`, `products`, `product_categories`, `flavors`, `inventory`, `inventory_adjustments`, `orders`, `order_items`, `store_settings`, `media_assets` |
| Supabase RPCs | `current_active_profile`, `admin_update_profile`, `get_admin_catalog_visibility`, `save_product_catalog`, `set_product_active`, `create_child_category`, `apply_inventory_adjustment`, `set_inventory_quantity`, `complete_order`, `cancel_order`, plus media-usage verification |
| Supabase Edge Function | `admin-users`: list, create, update, set password, deactivate, reactivate; includes active-admin authorization and compensation behavior |
| Cloudinary flow | Browser Upload Widget, image URL transformations, server-side asset registration and safe deletion; used assets cannot be deleted |
| Browser environment variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` |
| Server secrets | Supabase server credentials and Cloudinary API credentials must remain server-only; no secret is exposed to the browser |

## Current-page dependency matrix

| Current route/page | Target Feature | Supabase tables/resources | RPCs / server operations |
|---|---|---|---|
| Login | `auth-admin-access` | Supabase Auth, `profiles` | Password sign-in, `current_active_profile`, local sign-out |
| Dashboard | `dashboard-operations` | `inventory`, `inventory_adjustments`, `orders`, `store_settings`, catalog relations | `get_admin_catalog_visibility`; 15-second refresh for active operational queues |
| Brands | `catalog-taxonomy` | `brands`, `products`, `flavors`, `media_assets` | Standard CRUD, catalog-visibility cache invalidation, deactivation impact calculation |
| Categories | `catalog-taxonomy` | `categories`, `products`, `product_categories`, `flavors`, `media_assets` | `create_child_category`, catalog-visibility cache invalidation, parent/child deactivation impact calculation |
| Products | `product-catalog` | `products`, `brands`, `categories`, `product_categories`, `flavors`, `inventory`, `media_assets` | `get_admin_catalog_visibility`, `save_product_catalog`, `set_product_active` |
| Media | `media-library` | `media_assets` | Authenticated Cloudinary asset registration, safe-delete usage check via `get_media_asset_usage`, Cloudinary API delete |
| Inventory | `inventory` | `inventory`, `inventory_adjustments`, `flavors`, `products`, `store_settings` | `apply_inventory_adjustment`, `set_inventory_quantity` |
| Orders | `orders` | `orders`, `order_items`, `store_settings`, inventory audit relations | `complete_order`, `cancel_order`; cancellation restores stock atomically when applicable |
| Users | `admin-users` | Supabase Auth administration, `profiles` | Supabase Edge Function `admin-users`: list, create, update, set password, deactivate, reactivate; `admin_update_profile` |
| Store settings | `store-settings` | `store_settings`, `media_assets` | Standard singleton update; media selection for store logo |

## Environment variable names to preserve

No value is copied into the new project until it is supplied securely. The Next.js migration must preserve the following names or map them deliberately through a server-only configuration layer.

| Scope | Variable names | Purpose |
|---|---|---|
| Browser | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase browser client configuration |
| Browser | `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary upload widget and image delivery configuration |
| Server | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS` | Supabase server access, token verification, and privileged user-administration operations |
| Server | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary server-side asset verification, registration, and safe deletion |
| Server | `ADMIN_ALLOWED_ORIGINS` | Allowed origins for the existing `admin-users` Edge Function |

## Migration order and dependencies

| Phase | Work | Dependencies and gate |
|---:|---|---|
| 0 | Harden the next-maker baseline | Node.js 24+, pnpm-only normalization, remove Yarn references, resolve WebSocket test residue, and pass format/type/test/build |
| 1 | Shared platform and `auth-admin-access` | Supabase browser adapter, server-only Supabase admin adapter, role gate, persistent admin shell, RTL/layout tokens |
| 2 | `admin-users` and `media-library` | Reuse the existing Edge Function behavior or move it server-side only after parity tests; preserve Cloudinary register/delete safeguards |
| 3 | `catalog-taxonomy` | Depends on Media Library for brand/category imagery; retains hierarchy and impact preview |
| 4 | `product-catalog` | Depends on Media Library and Catalog Taxonomy; preserves flavors, visibility rules, and stock initialization |
| 5 | `inventory` | Depends on Product Catalog/flavors and existing atomic inventory RPCs |
| 6 | `orders` | Depends on Product Catalog and Inventory because cancel/complete flows affect stock and audit history |
| 7 | `store-settings` and `dashboard-operations` | Settings supplies timezone/low-stock threshold; dashboard aggregates all preceding Features |

## Non-negotiable acceptance gates

1. Run Node.js 24+ for the generator, local development, CI, and production.
2. Normalize package management to pnpm only: `pnpm-lock.yaml` is the only lockfile and no scripts/docs/CI references Yarn.
3. Preserve current Supabase table/RPC contracts and the Cloudinary safety flow before migrating UI behavior.
4. For every Feature, create parity tests before porting business logic; first observe each test fail against the missing Next.js implementation.
5. Before enabling a migrated Feature, require `format`, `type-check`, `test`, and `build` to pass.
6. Keep destructive operations explicit: deactivation impact, inventory adjustment reasons, order cancellation reason, and media usage protection must remain intact.

## Result

The recommended scope is **9 Features plus shared platform modules**. A strict one-resource-per-folder approach would create 10 route-oriented Features by splitting Brands and Categories, but the recommended `next-maker` architecture uses 9 Features because the two areas are one catalog taxonomy bounded context in the existing codebase.
