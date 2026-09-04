begin;

create extension if not exists pgtap with schema extensions;

select plan(38);

-- 1. Structure / security
select ok(
  to_regprocedure('public.create_variant_with_initial_stock(uuid,text,text,integer,integer)') is not null,
  'public.create_variant_with_initial_stock exists with five arguments'
);

select is(
  (select pronargdefaults::integer from pg_proc where proname = 'create_variant_with_initial_stock'),
  0,
  'public.create_variant_with_initial_stock has zero default arguments'
);

select ok(
  (select not prosecdef from pg_proc where proname = 'create_variant_with_initial_stock'),
  'public.create_variant_with_initial_stock is SECURITY INVOKER'
);

select ok(
  pg_catalog.has_function_privilege('authenticated', 'public.create_variant_with_initial_stock(uuid,text,text,integer,integer)', 'EXECUTE'),
  'authenticated can execute create_variant_with_initial_stock'
);

select ok(
  not pg_catalog.has_function_privilege('anon', 'public.create_variant_with_initial_stock(uuid,text,text,integer,integer)', 'EXECUTE'),
  'anon cannot execute create_variant_with_initial_stock'
);

select ok(
  not pg_catalog.has_function_privilege('public', 'public.create_variant_with_initial_stock(uuid,text,text,integer,integer)', 'EXECUTE'),
  'public cannot execute create_variant_with_initial_stock'
);

select ok(
  to_regprocedure('private.prepare_variant_hard_delete()') is not null,
  'private.prepare_variant_hard_delete() exists'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.product_variants'::regclass
      and tgname = 'product_variants_prepare_hard_delete'
      and (tgtype & 2::smallint) <> 0
      and (tgtype & 8::smallint) <> 0
  ),
  'product_variants_prepare_hard_delete exists as a BEFORE DELETE trigger on product_variants'
);

-- Set active Admin context
set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

-- 2. Create with zero stock
create temp table _test_vars (var_zero_id uuid, var_pos_id uuid, var_null_id uuid, var_op_id uuid, var_ord_id uuid) on commit drop;
insert into _test_vars (var_zero_id)
values ((
  select id from public.create_variant_with_initial_stock(
    '50000000-0000-0000-0000-000000000001'::uuid,
    'TEST-ZERO-01',
    'Zero Stock Variant',
    5,
    0
  )
));

select ok(
  exists (select 1 from public.product_variants where id = (select var_zero_id from _test_vars)),
  'Variant created with zero initial stock exists'
);

select is(
  (select is_active from public.product_variants where id = (select var_zero_id from _test_vars)),
  false,
  'Variant created with zero initial stock is inactive'
);

select ok(
  exists (select 1 from public.inventory where variant_id = (select var_zero_id from _test_vars)),
  'Inventory row exists for variant with zero initial stock'
);

select is(
  (select current_quantity from public.inventory where variant_id = (select var_zero_id from _test_vars)),
  0,
  'Inventory current_quantity is 0'
);

select is(
  (select count(*)::integer from public.inventory_adjustments where variant_id = (select var_zero_id from _test_vars)),
  0,
  'No initial_stock Inventory adjustment exists for zero initial stock'
);

-- 3. Create with positive initial stock
update _test_vars set var_pos_id = (
  select id from public.create_variant_with_initial_stock(
    '50000000-0000-0000-0000-000000000001'::uuid,
    'TEST-POS-25',
    'Positive Stock Variant',
    5,
    25
  )
);

select ok(
  exists (select 1 from public.product_variants where id = (select var_pos_id from _test_vars)),
  'Variant created with positive initial stock exists'
);

select is(
  (select current_quantity from public.inventory where variant_id = (select var_pos_id from _test_vars)),
  25,
  'Inventory quantity is 25'
);

select is(
  (select count(*)::integer from public.inventory_adjustments where variant_id = (select var_pos_id from _test_vars)),
  1,
  'Exactly one initial_stock adjustment exists'
);

select is(
  (select quantity_before from public.inventory_adjustments where variant_id = (select var_pos_id from _test_vars)),
  0,
  'initial_stock quantity_before is 0'
);

select is(
  (select quantity_change from public.inventory_adjustments where variant_id = (select var_pos_id from _test_vars)),
  25,
  'initial_stock quantity_change is 25'
);

select is(
  (select quantity_after from public.inventory_adjustments where variant_id = (select var_pos_id from _test_vars)),
  25,
  'initial_stock quantity_after is 25'
);

-- 4. Explicit NULL optional arguments
update _test_vars set var_null_id = (
  select id from public.create_variant_with_initial_stock(
    '50000000-0000-0000-0000-000000000001'::uuid,
    null,
    null,
    null,
    10
  )
);

select ok(
  exists (select 1 from public.product_variants where id = (select var_null_id from _test_vars)),
  'Calling RPC with explicit NULL optional arguments succeeds and variant exists'
);

select is(
  (select current_quantity from public.inventory where variant_id = (select var_null_id from _test_vars)),
  10,
  'Inventory quantity set correctly when optional arguments are null'
);

-- 5. Atomic rollback
reset role;

create or replace function pg_temp.simulated_ledger_fail()
returns trigger
language plpgsql
as $$
begin
  if new.adjustment_type = 'initial_stock'::public.inventory_adjustment_type
     and new.reason is null
     and new.quantity_change = 999 then
    raise exception 'SIMULATED_LEDGER_FAILURE';
  end if;
  return new;
end;
$$;

create trigger trg_simulated_ledger_fail
before insert on public.inventory_adjustments
for each row execute function pg_temp.simulated_ledger_fail();

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

select throws_ok(
  $$
    select public.create_variant_with_initial_stock(
      '50000000-0000-0000-0000-000000000001'::uuid,
      'FAIL-BC-ROLLBACK',
      'Rollback Variant',
      5,
      999
    )
  $$,
  'SIMULATED_LEDGER_FAILURE',
  'RPC failure during initial stock adjustment triggers rollback'
);

reset role;
drop trigger if exists trg_simulated_ledger_fail on public.inventory_adjustments;
drop function if exists pg_temp.simulated_ledger_fail();
set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

select ok(
  not exists (select 1 from public.product_variants where barcode = 'FAIL-BC-ROLLBACK'),
  'Rolled back Variant does not exist in product_variants'
);

select ok(
  not exists (
    select 1 from public.inventory i
    join public.product_variants pv on pv.id = i.variant_id
    where pv.barcode = 'FAIL-BC-ROLLBACK'
  ),
  'Rolled back Inventory row does not remain'
);

select ok(
  not exists (
    select 1 from public.inventory_adjustments ia
    join public.product_variants pv on pv.id = ia.variant_id
    where pv.barcode = 'FAIL-BC-ROLLBACK'
  ),
  'Rolled back Inventory adjustment row does not remain'
);

-- 6. Hard-delete tests
-- Case A: Fresh Variant, zero stock
delete from public.product_variants where id = (select var_zero_id from _test_vars);

select ok(
  not exists (select 1 from public.product_variants where id = (select var_zero_id from _test_vars)),
  'Fresh zero-stock Variant deleted successfully'
);

select ok(
  not exists (select 1 from public.inventory where variant_id = (select var_zero_id from _test_vars)),
  'Inventory cascaded on zero-stock Variant delete'
);

-- Case B: Variant with Initial Stock only (+ relations cascade)
insert into public.variant_option_values (variant_id, option_type_id, option_value_id)
values (
  (select var_pos_id from _test_vars),
  '30000000-0000-0000-0000-000000000001'::uuid,
  '40000000-0000-0000-0000-000000000001'::uuid
);

insert into public.product_variant_media (variant_id, media_asset_id, is_primary)
values (
  (select var_pos_id from _test_vars),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  true
);

delete from public.product_variants where id = (select var_pos_id from _test_vars);

select ok(
  not exists (select 1 from public.product_variants where id = (select var_pos_id from _test_vars)),
  'Setup-only Variant with Initial Stock deleted successfully'
);

select ok(
  not exists (select 1 from public.inventory_adjustments where variant_id = (select var_pos_id from _test_vars)),
  'initial_stock adjustment was removed by private trigger'
);

select ok(
  not exists (select 1 from public.inventory where variant_id = (select var_pos_id from _test_vars)),
  'Inventory cascaded on setup-only Variant delete'
);

select ok(
  not exists (select 1 from public.variant_option_values where variant_id = (select var_pos_id from _test_vars)),
  'variant_option_values cascaded on delete'
);

select ok(
  not exists (select 1 from public.product_variant_media where variant_id = (select var_pos_id from _test_vars)),
  'product_variant_media cascaded on delete'
);

select ok(
  exists (select 1 from public.media_assets where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid),
  'underlying media_assets row remains intact'
);

-- Case C: Operational Inventory history protects variant from deletion
update _test_vars set var_op_id = (
  select id from public.create_variant_with_initial_stock(
    '50000000-0000-0000-0000-000000000001'::uuid,
    'TEST-OP-HIST',
    'Operational History Variant',
    5,
    10
  )
);

-- Apply operational adjustment
select public.apply_inventory_adjustment(
  (select var_op_id from _test_vars),
  'stock_received'::public.inventory_adjustment_type,
  5,
  'Received stock delivery'
);

select throws_ok(
  $$ delete from public.product_variants where id = (select var_op_id from _test_vars) $$,
  '23503',
  null,
  'Hard delete is blocked by operational Inventory history'
);

select ok(
  exists (select 1 from public.product_variants where id = (select var_op_id from _test_vars)),
  'Variant with operational history remains protected'
);

-- Case D: Historical Order reference protects variant from deletion
update _test_vars set var_ord_id = (
  select id from public.create_variant_with_initial_stock(
    '50000000-0000-0000-0000-000000000001'::uuid,
    'TEST-ORD-HIST',
    'Order History Variant',
    5,
    10
  )
);

-- Attach to an order item
reset role;
insert into public.order_items (
  order_id,
  product_id,
  variant_id,
  product_name,
  variant_sku,
  quantity
) values (
  '80000000-0000-0000-0000-000000000001'::uuid,
  '50000000-0000-0000-0000-000000000001'::uuid,
  (select var_ord_id from _test_vars),
  'Berry Spark',
  'TEST-ORD-SKU',
  1
);

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

select throws_ok(
  $$ delete from public.product_variants where id = (select var_ord_id from _test_vars) $$,
  '23503',
  null,
  'Hard delete is blocked by historical Order reference'
);

select ok(
  exists (select 1 from public.product_variants where id = (select var_ord_id from _test_vars)),
  'Variant with historical Order reference remains protected'
);

select ok(
  exists (select 1 from public.order_items where variant_id = (select var_ord_id from _test_vars)),
  'Order item remains intact'
);

select * from finish();
rollback;
