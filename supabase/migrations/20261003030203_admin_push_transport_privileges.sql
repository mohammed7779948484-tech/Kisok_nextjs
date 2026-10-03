-- Harden newly introduced push transport; queued headers contain a webhook capability.
-- No business-table grants or business rows are changed.
set lock_timeout = '3s';
set statement_timeout = '30s';

revoke all on table net.http_request_queue, net._http_response
from public, anon, authenticated, service_role;
grant all on table net.http_request_queue, net._http_response to postgres;

revoke usage on schema net from public, anon, authenticated, service_role;
grant usage on schema net to postgres;

revoke execute on function net.http_post(text,jsonb,jsonb,jsonb,integer),
  net.http_get(text,jsonb,jsonb,integer),
  net.http_delete(text,jsonb,jsonb,integer,jsonb)
from public, anon, authenticated, service_role;
grant execute on function net.http_post(text,jsonb,jsonb,jsonb,integer),
  net.http_get(text,jsonb,jsonb,integer),
  net.http_delete(text,jsonb,jsonb,integer,jsonb)
to postgres;
