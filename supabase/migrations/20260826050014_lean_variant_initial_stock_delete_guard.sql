-- KIOSK Database V2 Lean · 14 Variant creation with initial stock & setup-only deletion.

create or replace function public.create_variant_with_initial_stock(
  product_id uuid,
  barcode text,
  title_override text,
  low_stock_threshold integer,
  initial_quantity integer
)
returns public.product_variants
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_variant public.product_variants%rowtype;
  normalized_barcode text;
  normalized_title_override text;
begin
  if not exists (
    select 1
    from public.current_active_profile() p
    where p.role = 'admin'
  ) then
    raise exception using errcode = '42501',
      message = 'An active Admin profile is required.';
  end if;

  if create_variant_with_initial_stock.product_id is null
     or create_variant_with_initial_stock.initial_quantity is null
     or create_variant_with_initial_stock.initial_quantity < 0
     or (
       create_variant_with_initial_stock.low_stock_threshold is not null
       and create_variant_with_initial_stock.low_stock_threshold < 0
     ) then
    raise exception using errcode = 'K1005',
      message = 'The Variant creation request is invalid.';
  end if;

  normalized_barcode :=
    nullif(pg_catalog.btrim(create_variant_with_initial_stock.barcode), '');

  normalized_title_override :=
    nullif(pg_catalog.btrim(create_variant_with_initial_stock.title_override), '');

  insert into public.product_variants (
    product_id,
    barcode,
    title_override,
    is_active,
    low_stock_threshold
  )
  values (
    create_variant_with_initial_stock.product_id,
    normalized_barcode,
    normalized_title_override,
    false,
    create_variant_with_initial_stock.low_stock_threshold
  )
  returning * into created_variant;

  if create_variant_with_initial_stock.initial_quantity > 0 then
    perform public.apply_inventory_adjustment(
      created_variant.id,
      'initial_stock'::public.inventory_adjustment_type,
      create_variant_with_initial_stock.initial_quantity,
      null
    );
  end if;

  return created_variant;
end;
$$;

revoke all on function public.create_variant_with_initial_stock(
  uuid, text, text, integer, integer
) from public, anon, authenticated, service_role;

grant execute on function public.create_variant_with_initial_stock(
  uuid, text, text, integer, integer
) to authenticated;

comment on function public.create_variant_with_initial_stock(
  uuid, text, text, integer, integer
) is
  'Atomically creates one inactive Product Variant and, when initial_quantity > 0, records its first inventory event as initial_stock.';

create or replace function private.prepare_variant_hard_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.order_items oi
    where oi.variant_id = old.id
  ) then
    raise exception using
      errcode = '23503',
      message = 'Variant has protected Order history and cannot be deleted.',
      constraint = 'order_items_variant_id_fkey';
  end if;

  if exists (
    select 1
    from public.inventory_adjustments ia
    where ia.variant_id = old.id
      and ia.adjustment_type <> 'initial_stock'::public.inventory_adjustment_type
  ) then
    raise exception using
      errcode = '23503',
      message = 'Variant has operational Inventory history and cannot be deleted.',
      constraint = 'inventory_adjustments_variant_id_fkey';
  end if;

  delete from public.inventory_adjustments ia
  where ia.variant_id = old.id
    and ia.adjustment_type = 'initial_stock'::public.inventory_adjustment_type;

  return old;
end;
$$;

revoke all on function private.prepare_variant_hard_delete()
from public, anon, authenticated, service_role;

drop trigger if exists product_variants_prepare_hard_delete
on public.product_variants;

create trigger product_variants_prepare_hard_delete
before delete on public.product_variants
for each row execute function private.prepare_variant_hard_delete();
