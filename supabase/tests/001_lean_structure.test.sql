begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

select ok(to_regclass('public.products') is not null, 'products exists');
select ok(to_regclass('public.product_variants') is not null, 'product_variants exists');
select ok(to_regclass('public.option_types') is not null, 'option_types exists');
select ok(to_regclass('public.option_values') is not null, 'option_values exists');
select ok(to_regclass('public.inventory') is not null, 'inventory exists');
select ok(to_regclass('public.orders') is not null, 'orders exists');

select ok(to_regclass('public.flavors') is null, 'legacy flavors table is absent');
select ok(to_regprocedure('public.reconcile_customer_cart(jsonb)') is null, 'server cart reconciliation is absent');
select ok(to_regprocedure('public.search_customer_products(text,integer)') is null, 'server catalog search RPC is absent');
select ok(to_regprocedure('public.save_product_catalog(jsonb,uuid[],uuid,jsonb[])') is null, 'giant Product aggregate RPC is absent');
select ok(to_regprocedure('public.move_catalog_item(text,uuid,uuid,uuid,uuid)') is null, 'complex move RPC is absent');

select ok(to_regprocedure('public.get_customer_catalog()') is not null, 'single Customer catalog RPC exists');
select ok(to_regprocedure('public.create_order(uuid,jsonb)') is not null, 'single atomic checkout RPC exists');
select ok(to_regprocedure('public.update_order_status(uuid,public.order_status,text)') is not null, 'single order status RPC exists');
select ok(to_regprocedure('public.reorder_items(text,uuid,uuid[])') is not null, 'simple full-scope reorder RPC exists');

select ok(
  (select pg_catalog.count(*)
   from pg_catalog.pg_proc p
   join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public','private')
     and p.prokind = 'f'
     and p.proname not like 'pg_%') <= 25,
  'Lean application function count stays small'
);

select ok(
  not pg_catalog.has_function_privilege(
    'authenticated',
    'public.admin_update_profile(uuid,uuid,jsonb)',
    'EXECUTE'
  ),
  'authenticated clients cannot call admin_update_profile'
);

select ok(
  pg_catalog.has_function_privilege(
    'service_role',
    'public.admin_update_profile(uuid,uuid,jsonb)',
    'EXECUTE'
  ),
  'service_role can call admin_update_profile'
);

select ok(
  not pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'SELECT'),
  'authenticated clients have no direct Profiles SELECT grant'
);

select ok(
  not pg_catalog.has_table_privilege('authenticated', 'public.inventory', 'UPDATE'),
  'authenticated clients have no direct Inventory UPDATE grant'
);

select ok(
  not pg_catalog.has_table_privilege('authenticated', 'public.inventory_adjustments', 'INSERT'),
  'authenticated clients have no direct Inventory ledger INSERT grant'
);

select ok(
  not pg_catalog.has_table_privilege('authenticated', 'public.orders', 'INSERT'),
  'authenticated clients have no direct Order INSERT grant'
);

select ok(
  not pg_catalog.has_table_privilege('authenticated', 'public.order_items', 'DELETE'),
  'authenticated clients have no direct Order Item DELETE grant'
);

select ok(
  pg_catalog.has_function_privilege(
    'authenticated', 'public.get_customer_catalog()', 'EXECUTE'
  ),
  'authenticated clients can call the Customer snapshot RPC'
);

select ok(
  pg_catalog.has_function_privilege(
    'authenticated', 'public.create_order(uuid,jsonb)', 'EXECUTE'
  ),
  'authenticated clients can call checkout; role authorization remains inside the RPC'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_attribute a
    where a.attrelid = 'public.product_categories'::regclass
      and a.attname in ('is_primary','display_order')
      and not a.attisdropped
  ),
  'Product Category links carry no Primary/order complexity'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_attribute a
    where a.attrelid = 'public.product_variants'::regclass
      and a.attname = 'option_signature'
      and not a.attisdropped
  ),
  'Variant option_signature complexity is removed'
);

select ok(
  (
    select pg_catalog.count(*)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (
        'profiles','media_assets','store_settings','brands','categories',
        'option_types','option_values','products','product_categories',
        'product_variants','variant_option_values','product_variant_media',
        'inventory','inventory_adjustments','orders','order_items'
      )
      and c.relrowsecurity
  ) = 16,
  'RLS is enabled on all sixteen application tables'
);

select is(
  (
    select pg_catalog.array_to_string(
      pg_catalog.array_agg(pt.tablename::text order by pt.tablename),
      ','
    )
    from pg_catalog.pg_publication_tables pt
    where pt.pubname = 'supabase_realtime'
      and pt.schemaname = 'public'
      and pt.tablename in (
        'brands','categories','products','product_categories',
        'product_variants','inventory','orders'
      )
  ),
  'orders',
  'Only orders is published from the application catalog/operations tables'
);

select * from finish();
rollback;
