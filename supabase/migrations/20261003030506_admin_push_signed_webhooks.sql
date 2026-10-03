-- Signed order events and single delivery claims; no business rows are modified.
set lock_timeout = '3s';
set statement_timeout = '30s';

create table public.push_delivery_claims (
  order_id uuid primary key references public.orders(id) on delete cascade,
  claimed_at timestamptz not null default now()
);
alter table public.push_delivery_claims enable row level security;
revoke all on table public.push_delivery_claims from public, anon, authenticated, service_role;
grant insert on public.push_delivery_claims to service_role;

create or replace function private.dispatch_order_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target_url text;
  webhook_secret text;
  payload jsonb;
begin
  select decrypted_secret into target_url
  from vault.decrypted_secrets where name = 'kisok_order_push_url';
  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets where name = 'kisok_order_push_secret';
  -- Missing configuration is the reversible off switch.
  if target_url is null or webhook_secret is null then return new; end if;
  if target_url !~ '^https://[a-z0-9]+\.supabase\.co/functions/v1/order-push$'
     or length(webhook_secret) < 32 then
    raise warning 'KISOK order push configuration invalid';
    return new;
  end if;
  payload := jsonb_build_object(
    'type', 'INSERT', 'schema', 'public', 'table', 'orders',
    'record', jsonb_build_object(
      'id', new.id, 'display_number', new.display_number, 'created_at', new.created_at
    )
  );
  -- pg_net transmits body::text as UTF8. Only its signature enters the managed queue.
  perform net.http_post(
    url := target_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-kisok-webhook-signature', encode(extensions.hmac(
        convert_to(payload::text, 'UTF8'), convert_to(webhook_secret, 'UTF8'), 'sha256'
      ), 'hex')
    ),
    body := payload,
    timeout_milliseconds := 2000
  );
  return new;
exception when others then
  -- Notification infrastructure may never reject an operational order.
  raise warning 'KISOK order push enqueue failed [%]', sqlstate;
  return new;
end;
$$;
