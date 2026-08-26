-- Deterministic local-only KISOK Admin dataset.
-- KISOK has no pricing, currency, revenue, tax, or payment domain.
--
-- `encrypted_password = ''` below only satisfies the profiles(id) FK during
-- `supabase db reset` — it is not a working password hash and cannot be used
-- to log in. Run `scripts/seed-local-auth.sh` (or `.ps1` on Windows) against
-- your local Supabase instance afterward to get real, documented local
-- credentials via the Auth Admin API. See docs/LOCAL_SUPABASE_SETUP.md.

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin@kiosk.local', '', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'admin-two@kiosk.local', '', now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'preparation@kiosk.local', '', now(), now(), now()),
  ('44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'customer@kiosk.local', '', now(), now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, display_name, role, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'KISOK Admin', 'admin', true),
  ('22222222-2222-2222-2222-222222222222', 'Operations Admin', 'admin', true),
  ('33333333-3333-3333-3333-333333333333', 'Preparation Desk', 'preparation', true),
  ('44444444-4444-4444-4444-444444444444', 'Kiosk Customer', 'customer', true)
on conflict (id) do update set display_name = excluded.display_name, role = excluded.role, is_active = excluded.is_active;

insert into public.store_settings (
  id, store_name, global_low_stock_threshold, customer_success_reset_seconds, store_timezone
)
values (true, 'KISOK Demo Store', 5, 25, 'UTC')
on conflict (id) do update set
  store_name = excluded.store_name,
  global_low_stock_threshold = excluded.global_low_stock_threshold,
  customer_success_reset_seconds = excluded.customer_success_reset_seconds,
  store_timezone = excluded.store_timezone;

insert into public.media_assets (id, public_id, secure_url, asset_id, width, height, format, bytes, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'kiosk/demo/logo', 'https://res.cloudinary.com/demo/image/upload/kiosk/demo/logo.png', 'demo-logo', 512, 512, 'png', 32768, '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'kiosk/demo/berry', 'https://res.cloudinary.com/demo/image/upload/kiosk/demo/berry.png', 'demo-berry', 800, 800, 'png', 49152, '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'kiosk/demo/mint', 'https://res.cloudinary.com/demo/image/upload/kiosk/demo/mint.png', 'demo-mint', 800, 800, 'png', 57344, '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

update public.store_settings
set logo_media_asset_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

insert into public.brands (id, name, image_media_asset_id, is_active)
values
  ('10000000-0000-0000-0000-000000000001', 'Northline', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true),
  ('10000000-0000-0000-0000-000000000002', 'Field Notes', null, true),
  ('10000000-0000-0000-0000-000000000003', 'Archived Brand', null, false)
on conflict (id) do nothing;

insert into public.categories (id, name, parent_id, is_active)
values
  ('20000000-0000-0000-0000-000000000001', 'Drinks', null, true),
  ('20000000-0000-0000-0000-000000000002', 'Energy Drinks', '20000000-0000-0000-0000-000000000001', true),
  ('20000000-0000-0000-0000-000000000003', 'Snacks', null, true),
  ('20000000-0000-0000-0000-000000000004', 'Archived', null, false)
on conflict (id) do nothing;

insert into public.option_types (id, name, is_active)
values
  ('30000000-0000-0000-0000-000000000001', 'Flavor', true),
  ('30000000-0000-0000-0000-000000000002', 'Size', true),
  ('30000000-0000-0000-0000-000000000003', 'Archived Type', false)
on conflict (id) do nothing;

insert into public.option_values (id, option_type_id, value, is_active)
values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Berry', true),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Mint', true),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'Small', true),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', 'Large', true),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000003', 'Legacy', false)
on conflict (id) do nothing;

insert into public.products (id, name, brand_id, cover_media_asset_id, short_description, search_keywords, is_featured, is_active)
values
  ('50000000-0000-0000-0000-000000000001', 'Berry Spark', '10000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Berry energy drink.', array['berry','energy'], true, true),
  ('50000000-0000-0000-0000-000000000002', 'Mint Water', null, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Simple still water.', array['mint','water'], false, true),
  ('50000000-0000-0000-0000-000000000003', 'Trail Mix', '10000000-0000-0000-0000-000000000002', null, 'Mixed snack pack.', array['snack','mix'], false, true)
on conflict (id) do nothing;

insert into public.product_categories (product_id, category_id)
values
  ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'),
  ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003')
on conflict do nothing;

insert into public.product_variants (id, product_id, barcode, title_override, search_keywords, is_active, low_stock_threshold)
values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '890000000001', null, array['berry','small'], true, 5),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', null, null, array['berry','large'], true, 5),
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', null, null, array['mint'], true, 5),
  ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', null, null, array['trail','mix'], true, 2)
on conflict (id) do nothing;

insert into public.variant_option_values (variant_id, option_type_id, option_value_id)
values
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003'),
  ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000004')
on conflict (variant_id, option_type_id) do nothing;

insert into public.product_variant_media (variant_id, media_asset_id, is_primary)
values
  ('60000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true),
  ('60000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true),
  ('60000000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true)
on conflict (variant_id, media_asset_id) do nothing;

insert into public.inventory_adjustments (
  id, variant_id, quantity_change, quantity_before, quantity_after, adjustment_type, reason, created_by
)
values
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 8, 0, 8, 'initial_stock', null, '11111111-1111-1111-1111-111111111111'),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 20, 0, 20, 'initial_stock', null, '11111111-1111-1111-1111-111111111111'),
  ('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000003', 3, 0, 3, 'initial_stock', null, '11111111-1111-1111-1111-111111111111'),
  ('70000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000004', 5, 0, 5, 'initial_stock', null, '11111111-1111-1111-1111-111111111111');

insert into public.orders (
  id, display_number, client_request_id, request_fingerprint, status,
  created_by, assigned_preparation_id, completed_by, completed_at,
  cancelled_by, cancelled_at, cancellation_reason
)
values
  -- Six characters from the display_number CHECK's restricted alphabet
  -- (A-H, J-N, P-Z, 2-9 — no 0/O/1/I) per
  -- 20260826050004_lean_inventory_orders_schema.sql.
  ('80000000-0000-0000-0000-000000000001', 'KS2AB2', '81000000-0000-0000-0000-000000000001', 'kiosk.seed.001', 'new', '44444444-4444-4444-4444-444444444444', null, null, null, null, null, null),
  ('80000000-0000-0000-0000-000000000002', 'KS2AB3', '81000000-0000-0000-0000-000000000002', 'kiosk.seed.002', 'preparing', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', null, null, null, null),
  ('80000000-0000-0000-0000-000000000003', 'KS2AB4', '81000000-0000-0000-0000-000000000003', 'kiosk.seed.003', 'ready', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', null, null, null, null),
  ('80000000-0000-0000-0000-000000000004', 'KS2AB5', '81000000-0000-0000-0000-000000000004', 'kiosk.seed.004', 'completed', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', now(), null, null, null),
  ('80000000-0000-0000-0000-000000000005', 'KS2AB6', '81000000-0000-0000-0000-000000000005', 'kiosk.seed.005', 'cancelled', '44444444-4444-4444-4444-444444444444', null, null, null, '33333333-3333-3333-3333-333333333333', now(), 'Customer cancelled')
on conflict (id) do nothing;

insert into public.order_items (
  id, order_id, product_id, variant_id, product_name, variant_name, variant_sku,
  variant_options, brand_name, image_public_id, image_secure_url, quantity
)
values
  ('82000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003', 'Mint Water', null, 'KSK-000003', '[]'::jsonb, null, 'kiosk/demo/mint', 'https://res.cloudinary.com/demo/image/upload/kiosk/demo/mint.png', 1),
  ('82000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Berry Spark', 'Berry · Small', 'KSK-000001', '[{"type":"Flavor","value":"Berry"},{"type":"Size","value":"Small"}]'::jsonb, 'Northline', 'kiosk/demo/berry', 'https://res.cloudinary.com/demo/image/upload/kiosk/demo/berry.png', 1),
  ('82000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 'Berry Spark', 'Berry · Large', 'KSK-000002', '[{"type":"Flavor","value":"Berry"},{"type":"Size","value":"Large"}]'::jsonb, 'Northline', 'kiosk/demo/berry', 'https://res.cloudinary.com/demo/image/upload/kiosk/demo/berry.png', 1),
  ('82000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000004', 'Trail Mix', null, 'KSK-000004', '[]'::jsonb, 'Field Notes', null, null, 1),
  ('82000000-0000-0000-0000-000000000005', '80000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Berry Spark', 'Berry · Small', 'KSK-000001', '[{"type":"Flavor","value":"Berry"},{"type":"Size","value":"Small"}]'::jsonb, 'Northline', 'kiosk/demo/berry', 'https://res.cloudinary.com/demo/image/upload/kiosk/demo/berry.png', 1);

insert into public.inventory_adjustments (
  id, variant_id, quantity_change, quantity_before, quantity_after, adjustment_type, reason, created_by, order_id
)
values
  ('70000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000002', -1, 20, 19, 'order_deduction', null, '44444444-4444-4444-4444-444444444444', '80000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000001', -1, 8, 7, 'order_deduction', null, '44444444-4444-4444-4444-444444444444', '80000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000003', -2, 3, 1, 'order_deduction', null, '44444444-4444-4444-4444-444444444444', '80000000-0000-0000-0000-000000000003'),
  ('70000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000004', -1, 5, 4, 'order_deduction', null, '44444444-4444-4444-4444-444444444444', '80000000-0000-0000-0000-000000000004'),
  ('70000000-0000-0000-0000-000000000009', '60000000-0000-0000-0000-000000000001', -1, 7, 6, 'order_deduction', null, '44444444-4444-4444-4444-444444444444', '80000000-0000-0000-0000-000000000005'),
  ('70000000-0000-0000-0000-000000000010', '60000000-0000-0000-0000-000000000001', 1, 6, 7, 'order_cancellation_restoration', null, '33333333-3333-3333-3333-333333333333', '80000000-0000-0000-0000-000000000005');

-- Applied once, after every ledger row above, so current_quantity always
-- equals the cumulative sum of this variant's inventory_adjustments rows —
-- never a value the ledger can't independently reconstruct.
-- variant 0001: initial 8, -1 (order 0002), -1 (order 0005), +1 (restoration) = 7
-- variant 0002: initial 20, -1 (order 0001) = 19
-- variant 0003: initial 3, -2 (order 0003) = 1
-- variant 0004: initial 5, -1 (order 0004) = 4
update public.inventory set current_quantity = case variant_id
  when '60000000-0000-0000-0000-000000000001' then 7
  when '60000000-0000-0000-0000-000000000002' then 19
  when '60000000-0000-0000-0000-000000000003' then 1
  when '60000000-0000-0000-0000-000000000004' then 4
end
where variant_id in (
  '60000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000002',
  '60000000-0000-0000-0000-000000000003',
  '60000000-0000-0000-0000-000000000004'
);
