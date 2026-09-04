begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

-- Ensure a clean fixture slate within this test transaction.
-- (Any preexisting seed data is automatically restored on rollback.)
truncate table
  public.inventory_adjustments,
  public.order_items,
  public.orders,
  public.product_variant_media,
  public.variant_option_values,
  public.product_variants,
  public.product_categories,
  public.products,
  public.option_values,
  public.option_types,
  public.categories,
  public.brands,
  public.media_assets,
  public.store_settings,
  public.profiles
cascade;
delete from auth.users;

-- Stable test identities.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin-a@test.local', '', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'admin-b@test.local', '', now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'prep@test.local', '', now(), now(), now()),
  ('44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'customer@test.local', '', now(), now(), now());

insert into public.profiles (id, display_name, role, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'Admin A', 'admin', true),
  ('22222222-2222-2222-2222-222222222222', 'Admin B', 'admin', true),
  ('33333333-3333-3333-3333-333333333333', 'Preparation', 'preparation', true),
  ('44444444-4444-4444-4444-444444444444', 'Customer', 'customer', true);

insert into public.store_settings (
  id, store_name, global_low_stock_threshold,
  customer_success_reset_seconds, store_timezone
)
values (true, 'Lean Test Store', 5, 25, 'UTC');

insert into public.brands (id, name)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Active Brand');

insert into public.categories (id, name)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Category');

insert into public.option_types (id, name)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Volume');

insert into public.option_values (id, option_type_id, value)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '30 ml'
);

insert into public.products (
  id, name, brand_id, is_featured, is_active
)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'Test Product',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true,
  true
);

insert into public.product_categories (product_id, category_id)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

insert into public.product_variants (
  id, product_id, title_override, is_active
)
values (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  null,
  true
);

insert into public.variant_option_values (
  variant_id, option_type_id, option_value_id
)
values (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

select is(
  public.apply_inventory_adjustment(
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'initial_stock',
    5,
    null
  ) ->> 'quantity_after',
  '5',
  'Admin can establish initial stock through the ledger-backed Inventory RPC'
);

reset role;

-- Customer visibility is derived at read/checkout time rather than through
-- a large activation/visibility helper graph.
update public.option_values
set is_active = false
where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

set local role authenticated;
set local "request.jwt.claim.sub" = '44444444-4444-4444-4444-444444444444';

select is(
  pg_catalog.jsonb_array_length(public.get_customer_catalog() -> 'variants'),
  0,
  'inactive Option master data hides the affected Variant from the snapshot'
);

select throws_ok(
  $$
    select public.create_order(
      '66666666-6666-6666-6666-666666666666',
      '[{"variant_id":"ffffffff-ffff-ffff-ffff-ffffffffffff","quantity":1}]'::jsonb
    )
  $$,
  'K1002',
  'One or more requested Variants are unavailable.',
  'checkout rejects a Variant hidden by inactive Option master data'
);

reset role;
update public.option_values
set is_active = true
where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

-- Customer sees no raw catalog rows, but receives one snapshot.
set local role authenticated;
set local "request.jwt.claim.sub" = '44444444-4444-4444-4444-444444444444';

select is(
  (select pg_catalog.count(*)::integer from public.products),
  0,
  'Customer raw Product SELECT is blocked by RLS'
);

select is(
  pg_catalog.jsonb_array_length(public.get_customer_catalog() -> 'products'),
  1,
  'Customer snapshot contains the visible Product'
);

select is(
  pg_catalog.jsonb_array_length(public.get_customer_catalog() -> 'variants'),
  1,
  'Customer snapshot contains the valid Variant'
);

select is(
  public.create_order(
    '55555555-5555-5555-5555-555555555555',
    '[{"variant_id":"ffffffff-ffff-ffff-ffff-ffffffffffff","quantity":2}]'::jsonb
  ) ->> 'kind',
  'success',
  'Customer can submit an order'
);

select is(
  public.create_order(
    '55555555-5555-5555-5555-555555555555',
    '[{"variant_id":"ffffffff-ffff-ffff-ffff-ffffffffffff","quantity":2}]'::jsonb
  ) ->> 'kind',
  'success',
  'same client_request_id is idempotent'
);


select is(
  (select pg_catalog.count(*)::integer from public.orders),
  0,
  'Customer raw Order SELECT is blocked by RLS'
);

select throws_ok(
  $$
    select public.create_order(
      '55555555-5555-5555-5555-555555555555',
      '[{"variant_id":"ffffffff-ffff-ffff-ffff-ffffffffffff","quantity":1}]'::jsonb
    )
  $$,
  'K1003',
  'The checkout request conflicts with an existing request.',
  'same client_request_id with a different payload is rejected'
);

select is(
  public.create_order(
    '88888888-8888-8888-8888-888888888888',
    '[{"variant_id":"ffffffff-ffff-ffff-ffff-ffffffffffff","quantity":4}]'::jsonb
  ) ->> 'kind',
  'stock_conflict',
  'checkout reports a stock conflict without creating an Order'
);

select throws_ok(
  $$
    select public.admin_update_profile(
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      '{"is_active":false}'::jsonb
    )
  $$,
  '42501',
  null,
  'authenticated browser cannot call the service-role Admin profile mutation'
);

reset role;

select is(
  (select current_quantity from public.inventory
   where variant_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
  3,
  'checkout deducts stock exactly once'
);

select is(
  (select pg_catalog.count(*)::integer from public.orders),
  1,
  'idempotent retry creates only one Order'
);

select is(
  (select pg_catalog.count(*)::integer from public.order_items),
  1,
  'checkout creates one immutable Order Item'
);

select is(
  (select pg_catalog.count(*)::integer
   from public.inventory_adjustments
   where adjustment_type = 'order_deduction'),
  1,
  'checkout creates one stock-deduction ledger entry'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '44444444-4444-4444-4444-444444444444';

select is(
  public.create_order(
    '77777777-7777-7777-7777-777777777777',
    '[{"variant_id":"ffffffff-ffff-ffff-ffff-ffffffffffff","quantity":1}]'::jsonb
  ) ->> 'kind',
  'success',
  'Customer can create a second independent Order'
);

reset role;

-- Preparation workflow mirrors the current Flutter actions.
set local role authenticated;
set local "request.jwt.claim.sub" = '33333333-3333-3333-3333-333333333333';

select is(
  public.update_order_status(
    (select id from public.orders
     where client_request_id = '77777777-7777-7777-7777-777777777777'),
    'cancelled',
    null
  ) ->> 'status',
  'cancelled',
  'Preparation can cancel a new Order'
);

reset role;

select is(
  (select current_quantity from public.inventory
   where variant_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
  3,
  'cancellation restores the second Order stock exactly once'
);

select is(
  (select pg_catalog.count(*)::integer
   from public.inventory_adjustments ia
   join public.orders o on o.id = ia.order_id
   where o.client_request_id = '77777777-7777-7777-7777-777777777777'
     and ia.adjustment_type = 'order_cancellation_restoration'),
  1,
  'cancellation creates one restoration ledger entry'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

select is(
  public.set_inventory_quantity(
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    4,
    'Test set quantity'
  ) ->> 'quantity_after',
  '4',
  'Admin can set an absolute Inventory quantity through the ledger-backed RPC'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = '33333333-3333-3333-3333-333333333333';

select is(
  public.update_order_status(
    (select id from public.orders
     where client_request_id = '55555555-5555-5555-5555-555555555555'),
    'preparing',
    null
  ) ->> 'status',
  'preparing',
  'Preparation can claim a new Order'
);

select is(
  public.update_order_status(
    (select id from public.orders
     where client_request_id = '55555555-5555-5555-5555-555555555555'),
    'ready',
    null
  ) ->> 'status',
  'ready',
  'assigned Preparation can mark the Order ready'
);

reset role;

-- Admin completes the ready Order.
set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

select is(
  public.update_order_status(
    (select id from public.orders
     where client_request_id = '55555555-5555-5555-5555-555555555555'),
    'completed',
    null
  ) ->> 'status',
  'completed',
  'Admin can complete a ready Order'
);

select lives_ok(
  $$
    insert into public.products (name, is_active)
    values ('Admin Direct CRUD Product', false)
  $$,
  'Admin can use direct RLS-protected catalog CRUD'
);

insert into public.media_assets (public_id, secure_url)
values ('lean-test-media', 'https://example.test/lean-test-media.png');

select is(
  (public.get_media_asset_usage(
    (select id from public.media_assets where public_id = 'lean-test-media')
  ) ->> 'order_items_historical')::integer,
  0,
  'Admin Media usage RPC reports an unreferenced Media Asset correctly'
);

select lives_ok(
  $$
    select public.reorder_items(
      'products',
      null,
      array(
        select id from public.products order by display_order desc
      )
    )
  $$,
  'Admin can reorder a complete Product scope'
);

reset role;

-- Service-role-only Admin profile helper keeps the last-admin/self guard.
set local role service_role;

select is(
  (select pg_catalog.count(*)::integer
   from public.search_admin_profiles('', 50, 0)),
  4,
  'service-role Admin Users search returns the seeded Profiles'
);

select throws_ok(
  $$
    select public.admin_update_profile(
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      '{"is_active":false}'::jsonb
    )
  $$,
  '23514',
  'you cannot remove your own administrator access',
  'Admin profile helper preserves the self-demotion guard'
);

select lives_ok(
  $$
    select public.admin_update_profile(
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      '{"is_active":false}'::jsonb
    )
  $$,
  'service-role Admin-user flow can deactivate another Admin'
);

select * from finish();
rollback;
