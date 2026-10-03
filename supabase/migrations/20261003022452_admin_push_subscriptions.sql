-- Additive device capabilities only. Existing operational rows are never modified.
set lock_timeout = '3s';
set statement_timeout = '30s';

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{87}$'),
  auth text not null check (auth ~ '^[A-Za-z0-9_-]{22}$'),
  vapid_public_key text not null check (vapid_public_key ~ '^[A-Za-z0-9_-]{87}$'),
  locale text not null default 'en' check (locale = 'en'),
  user_agent text check (length(user_agent) <= 512),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint push_endpoint_provider check (
    length(endpoint) <= 2048 and endpoint ~
    '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com|web\.push\.apple\.com)/[^[:space:]]+$'
  )
);
create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_own_select on public.push_subscriptions
for select to authenticated using (
  user_id = (select auth.uid()) and
  exists (select 1 from public.current_active_profile() p where p.role = 'admin')
);
create policy push_subscriptions_own_insert on public.push_subscriptions
for insert to authenticated with check (
  user_id = (select auth.uid()) and
  exists (select 1 from public.current_active_profile() p where p.role = 'admin')
);
create policy push_subscriptions_own_update on public.push_subscriptions
for update to authenticated using (
  user_id = (select auth.uid()) and
  exists (select 1 from public.current_active_profile() p where p.role = 'admin')
) with check (
  user_id = (select auth.uid()) and
  exists (select 1 from public.current_active_profile() p where p.role = 'admin')
);
create policy push_subscriptions_own_delete on public.push_subscriptions
for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.push_subscriptions from public, anon, authenticated, service_role;
grant select, delete on public.push_subscriptions to authenticated;
grant insert (user_id, endpoint, p256dh, auth, vapid_public_key, locale, user_agent, expires_at)
  on public.push_subscriptions to authenticated;
grant update (p256dh, auth, vapid_public_key, locale, user_agent, expires_at, last_seen_at)
  on public.push_subscriptions to authenticated;
grant select, delete on public.push_subscriptions to service_role;

create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
for each row execute function public.set_updated_at();

create extension if not exists pg_net with schema extensions;

create function private.dispatch_order_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target_url text;
  webhook_secret text;
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
  perform net.http_post(
    url := target_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-kisok-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT', 'schema', 'public', 'table', 'orders',
      'record', jsonb_build_object(
        'id', new.id, 'display_number', new.display_number, 'created_at', new.created_at
      )
    ),
    timeout_milliseconds := 2000
  );
  return new;
exception when others then
  -- Notification infrastructure may never reject an operational order.
  raise warning 'KISOK order push enqueue failed [%]', sqlstate;
  return new;
end;
$$;
revoke all on function private.dispatch_order_push() from public, anon, authenticated, service_role;
create trigger orders_dispatch_web_push after insert on public.orders
for each row execute function private.dispatch_order_push();
