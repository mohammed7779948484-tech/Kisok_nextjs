-- Local Supabase only. Never run the repository behavior suite against Production.
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

select ok(to_regclass('public.push_subscriptions') is not null, 'device table exists');
select ok((select relrowsecurity from pg_class where oid='public.push_subscriptions'::regclass), 'RLS enabled');
select ok(not has_table_privilege('anon','public.push_subscriptions','SELECT'), 'anon cannot enumerate subscriptions');
select ok(not has_table_privilege('authenticated','public.push_subscriptions','TRUNCATE'), 'authenticated cannot truncate');
select ok(not has_column_privilege('authenticated','public.push_subscriptions','user_id','UPDATE'), 'ownership is immutable');
select ok(not has_column_privilege('authenticated','public.push_subscriptions','endpoint','UPDATE'), 'endpoint is immutable');
select ok(has_table_privilege('service_role','public.push_subscriptions','SELECT'), 'sender may read');
select ok(has_table_privilege('service_role','public.push_subscriptions','DELETE'), 'sender may clean stale devices');
select ok(not has_table_privilege('service_role','public.push_subscriptions','INSERT'), 'sender cannot register devices');
select is((select count(*)::integer from pg_policies where tablename='push_subscriptions'), 4, 'four explicit own-device policies');
select ok(exists(select 1 from pg_constraint where conrelid='public.push_subscriptions'::regclass and contype='u'), 'endpoint is unique');
select ok(exists(select 1 from pg_constraint where conrelid='public.push_subscriptions'::regclass and contype='f' and confdeltype='c'), 'ephemeral device follows profile deletion');
select ok(exists(select 1 from pg_indexes where tablename='push_subscriptions' and indexname='push_subscriptions_user_id_idx'), 'user lookup is indexed');
select ok(not has_function_privilege('authenticated','private.dispatch_order_push()','EXECUTE'), 'browser cannot invoke webhook trigger');
select ok((select (tgtype & 4) = 4 and (tgtype & 16) = 0 and (tgtype & 8) = 0 from pg_trigger where tgname='orders_dispatch_web_push'), 'order trigger is INSERT only');

insert into auth.users(id,aud,role,email,created_at,updated_at)
values
('20000000-0000-0000-0000-000000000001','authenticated','authenticated','push-admin-a@test.local',now(),now()),
('20000000-0000-0000-0000-000000000002','authenticated','authenticated','push-admin-b@test.local',now(),now()),
('20000000-0000-0000-0000-000000000003','authenticated','authenticated','push-prep@test.local',now(),now()),
('20000000-0000-0000-0000-000000000004','authenticated','authenticated','push-inactive@test.local',now(),now());
insert into public.profiles(id,display_name,role,is_active)
values
('20000000-0000-0000-0000-000000000001','Push Admin A','admin',true),
('20000000-0000-0000-0000-000000000002','Push Admin B','admin',true),
('20000000-0000-0000-0000-000000000003','Push Preparation','preparation',true),
('20000000-0000-0000-0000-000000000004','Push Inactive','admin',false);

set local role authenticated;
set local "request.jwt.claim.sub" = '20000000-0000-0000-0000-000000000001';

select lives_ok($$
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth,vapid_public_key)
values('20000000-0000-0000-0000-000000000001','https://fcm.googleapis.com/push-test-a',repeat('B',87),repeat('A',22),repeat('B',87))
$$, 'active Admin registers own device');
select is((select count(*)::integer from public.push_subscriptions), 1, 'Admin sees own device');

select throws_ok($$
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth,vapid_public_key)
values('20000000-0000-0000-0000-000000000002','https://fcm.googleapis.com/push-cross',repeat('B',87),repeat('A',22),repeat('B',87))
$$, '42501', null, 'cross-user registration denied');

select throws_ok($$
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth,vapid_public_key)
values('20000000-0000-0000-0000-000000000001','https://fcm.googleapis.com/push-test-a',repeat('B',87),repeat('A',22),repeat('B',87))
$$, '23505', null, 'duplicate endpoint denied');

set local "request.jwt.claim.sub" = '20000000-0000-0000-0000-000000000002';
select is((select count(*)::integer from public.push_subscriptions), 0, 'second Admin cannot enumerate first Admin devices');
select is((with deleted as (delete from public.push_subscriptions returning id) select count(*)::integer from deleted), 0, 'second Admin cannot delete first Admin devices');

set local "request.jwt.claim.sub" = '20000000-0000-0000-0000-000000000003';
select throws_ok($$
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth,vapid_public_key)
values('20000000-0000-0000-0000-000000000003','https://fcm.googleapis.com/push-prep',repeat('B',87),repeat('A',22),repeat('B',87))
$$, '42501', null, 'Preparation cannot subscribe');

set local "request.jwt.claim.sub" = '20000000-0000-0000-0000-000000000004';
select throws_ok($$
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth,vapid_public_key)
values('20000000-0000-0000-0000-000000000004','https://fcm.googleapis.com/push-inactive',repeat('B',87),repeat('A',22),repeat('B',87))
$$, '42501', null, 'inactive Admin cannot subscribe');

reset role;
select throws_ok($$
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth,vapid_public_key)
values('20000000-0000-0000-0000-000000000099','https://fcm.googleapis.com/push-invalid-user',repeat('B',87),repeat('A',22),repeat('B',87))
$$, '23503', null, 'device requires an existing profile');

delete from public.profiles where id='20000000-0000-0000-0000-000000000001';
select is((select count(*)::integer from public.push_subscriptions where endpoint='https://fcm.googleapis.com/push-test-a'), 0, 'deleting a local test profile removes its ephemeral device');

select * from finish();
rollback;
