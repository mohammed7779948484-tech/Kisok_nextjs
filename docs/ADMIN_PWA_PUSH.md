# KISOK Admin PWA and order push

## Scope and baseline

Verified production alias: https://kisok-omega.vercel.app.
Vercel production deployment: dpl_AsGMLJk4rciG337tfRCoGpERKTqc.
Source branch: feat/lean-v2-admin-integration.
Starting commit: 6ee95d9f516bd0d3b05fca182d1e24bd88da603a.
Feature branch: feat/admin-pwa-push-notifications.
Supabase project: lccplcswursecygwpltj (Postgres 17).
The lockfile resolves Next.js 16.3.3, React 19.2.8, and Node 24+.

The original orders INSERT Realtime subscription owns unread state, toast,
and a session-scoped Web Audio chime. This remains the foreground experience.
Web Push is an additional best-effort background signal. The Orders queue is
always the source of truth.

## Architecture decisions

Use native App Router manifest metadata and a narrow public/sw.js, with no PWA
wrapper and no fetch handler, offline business-data caching, or background data
sync. The root client runtime registers the worker and captures optional native
installation prompts; the Admin sidebar owns user controls. /en/admin is the
start URL, / is the app and worker scope, and clicks open /en/admin/orders.
The verified locale configuration currently supports English only.

No repository logo existed beyond favicon files; the PNG icon route reproduces
the existing KISOK wordmark and blue accent with Next ImageResponse. It supplies
192, 512, maskable-safe 512, Apple 180, and monochrome badge variants.

Device capabilities live in public.push_subscriptions, with unique endpoints
and a profile FK. Cascade is deliberate for these ephemeral capabilities:
deleting a profile removes its device capabilities without changing operational
history. Ownership and endpoint cannot be updated by authenticated clients.
SELECT/INSERT/UPDATE require the owning active Admin; DELETE requires ownership.
The sender has SELECT and DELETE only. No existing business-table grants changed.

Authenticated Server Actions validate every registration, derive the owner from
getTrustedAdminSession, and use the cookie-authenticated client under RLS.
Next Server Actions provide same-origin request checking; no browser-callable
broadcast sender exists. Provider host allowlists prevent arbitrary outbound
HTTP targets. Delivery requests reject redirects and have a five-second deadline.

An INSERT-only trigger reads URL and shared-secret configuration from Vault
and enqueues pg_net HTTP work. Missing configuration is the off switch.
Its exception handler isolates enqueue failure from order creation. No old orders
are backfilled. The Edge Function verifies the shared secret, event shape,
public.orders INSERT, actual order identity, number, timestamp and five-minute
freshness. It joins subscriptions to active Admin profiles, scans bounded pages,
sends with five workers, deletes 404/410 devices, and retains transient failures.
There is no retry loop or guaranteed delivery; repeated events use stable OS tags.
Only aggregate counts and order IDs are logged.

Supabase Edge Functions were selected over a Vercel route because the event
origin is the database and asynchronous pg_net already fits that boundary.
Firebase, offline caches, and a replacement frontend were unnecessary.
web-push 3.6.7 is isolated to the Deno function through a pinned npm import;
generateRequestDetails supplies encryption/VAPID and Deno fetch sends requests.
Deno check validates this runtime. It is absent from the Next client dependency tree.

## Foreground and background

The worker asks visible Admin windows to acknowledge an order over MessageChannel.
The existing hook processes the order through the same bounded deduplication set
used for Realtime. A positive acknowledgement suppresses an OS notification
where the browser allows it. An unanswered request falls back to OS display after
800 ms. Hidden Realtime updates retain unread state but do not play Web Audio.

WebKit requires showNotification for every push: foreground WebKit display uses
silent:true after acknowledgement. Safari may still show a visual system
notification or disregard silent settings; zero duplicate OS UI cannot be
promised across all browsers. Firefox can impose silent-push quotas.
System sound, Focus modes, browser settings and power policies belong to the OS.
Closed apps cannot play the custom foreground Web Audio chime.

Notification content contains only the order display number. The tag is
order:<UUID>. Notification clicks disregard supplied URLs, close the notification,
navigate/focus an existing same-origin Admin window or open the fixed Orders URL.
Navigating a focused editor through an OS click can leave unsaved local edits;
operators should save drafts before following notifications.

## Installation and supported platforms

- Desktop Chrome/Edge and Android Chromium: native install button appears only
  after beforeinstallprompt; browser installation menus also work.
- Safari macOS: browser Add to Dock/install UI where available; Web Push on
  compatible Safari/macOS versions (Safari 16 on macOS 13+).
- iOS/iPadOS 16.4+: add to Home Screen, open that installed app, and enable
  notifications with a user gesture. A regular Safari tab cannot enable iOS push.
- Firefox: Web Push is supported; desktop installation does not expose the
  Chromium beforeinstallprompt flow.

Permission is requested only from Enable device notifications.
Blocked/default/unsupported/unconfigured states are explicit. Permissions cannot
be reset by application code: change browser/site settings.
The PWA uses the existing Supabase cookie session, refresh proxy, and locale
login flow. OS/browser session policies can differ from ordinary browser tabs;
standalone real-device authentication acceptance remains mandatory.

## Configuration and deployment

Vercel build-time public configuration:

- NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY

Supabase Edge secrets:

- WEB_PUSH_VAPID_PUBLIC_KEY
- WEB_PUSH_VAPID_PRIVATE_KEY
- WEB_PUSH_VAPID_SUBJECT
- ORDER_PUSH_WEBHOOK_SECRET

Supabase supplies SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the function.
The existing Next authenticated client uses NEXT_PUBLIC_SUPABASE_URL and
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Push registration does not use a service key.

Generate one VAPID pair in a trusted terminal:
`pnpm dlx web-push@3.6.7 generate-vapid-keys --json`.
Generate an independent shared secret:
`openssl rand -hex 32`.
Keep output out of logs/Git. Use a real mailto address or public HTTPS contact URI
for the subject. Store Edge values in an ignored secrets file and run
`pnpm supabase secrets set --project-ref lccplcswursecygwpltj --env-file <ignored-file>`.
Set the matching public key in Vercel Preview/Production build environments.
Redeploy after changing a NEXT_PUBLIC variable.

Deploy the exact repository function:
`pnpm supabase functions deploy order-push --project-ref lccplcswursecygwpltj --no-verify-jwt`.
verify_jwt=false is intentional: custom webhook authentication rejects missing,
wrong or unconfigured secrets before any database access. The service-role key
is never used as the public invocation credential.

In Supabase Vault, create two named secrets through the Dashboard:
kisok_order_push_url = https://lccplcswursecygwpltj.supabase.co/functions/v1/order-push
and kisok_order_push_secret = the same ORDER_PUSH_WEBHOOK_SECRET.
Use the Dashboard to avoid embedding secrets in SQL/migration history.
Configure the sender and application first; activate Vault configuration last.
The trigger already exists; do not create an additional Dashboard webhook.
Observe Edge aggregate logs and net._http_response after activation.

## Database source of truth and drift

Applied migration: 20261003022452_admin_push_subscriptions.sql.
The local file is the exact SQL supplied to apply_migration; its version matches
the remote ledger. Added: push table, constraints, three indexes, four policies,
restricted grants, timestamp trigger, pg_net extension, private dispatch function,
and the orders INSERT trigger. The existing orders table gained that trigger;
its columns, rows, constraints and grants were untouched.

Before/after comparisons confirmed existing business schema unchanged except
the new trigger. Counts of orders, order_items, profiles, products,
product_variants, inventory, inventory_adjustments, brands, categories,
media_assets and store_settings were unchanged. Production smoke fixtures touched
only the new push table in transactions that rolled back.

Pre-existing drift is unresolved deliberately: production's ledger initially
contained only 20260930032003_customer_catalog_v2_available_quantity, while the
repository has fourteen August baseline migrations. Production also has
get_customer_catalog_v2 and other catalog differences. Do not run an unreviewed
db push that replays baseline migrations; reconcile historical migration tracking
separately before using that workflow. This task did not repair or rewrite it.

## Verification and operations

Run `pnpm validate`; CI additionally starts an isolated local Supabase and runs
all pgTAP tests, performs Deno check, and tests manifest/PNG/worker registration
against a production build in headless Chromium. Existing pgTAP behavior tests
truncate local fixtures: NEVER run that suite on Production.
Production own-device/cross-user smoke tests use rollback-only new-table rows.

Real-device acceptance after configuration:
1. Install and sign in; refresh and reopen to verify session persistence.
2. Enable one device after granting permission; repeat to verify idempotence.
3. With Admin visible, use a local/test order and verify badge/toast/chime once.
4. Background, then close the app; use separate local/test orders and inspect
   system delivery and Orders click focus.
5. Repeat on a second device for the same Admin.
6. Disable notifications; verify Realtime still works and device push stops.
7. Sign out, expire a test session, and sign in as another test Admin.
8. Confirm no old account capability is reused.
Use a staging/local order flow or an agreed controlled business event. Do not
insert or mutate production business records for these checks.

Disabling or signing out unsubscribes at the provider and removes the server row.
Expired-session SIGNED_OUT also cleans the local browser capability. On later
login, an owner mismatch invalidates the old browser subscription rather than
transferring it. VAPID rotation invalidates old browser registrations.
Subscription change events notify open clients; an absent/expired subscription
requires the operator to explicitly enable again on the next app visit.
There is no authenticated background re-subscription from a closed worker.

## Rollback

Clear/deactivate the Vault URL configuration to stop enqueuing pushes, or disable
only orders_dispatch_web_push through a reviewed operational change.
Redeploy the verified previous application commit. Leave the additive table,
policies, extension and function in place; no destructive schema rollback is needed.
An application rollback alone does not unregister installed service workers:
push must be disabled before rollback, and existing installations should remove
device notification permissions or unsubscribe before reverting code.

## Official research record (2026-10-03)

| Source | Applied conclusion |
| --- | --- |
| [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps) (also read versioned 16.3.3 source) | Native manifest, public worker, explicit permission, no-store worker headers |
| [Next manifest](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest) and [icons](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons) | App Router metadata and PNG variants |
| [Next Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) | Public icon PNG handler with async route params |
| [MDN Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker) | Worker registration, activation and lifecycle |
| [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API), [subscribe](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe), [subscription](https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription) | Capability secrecy, explicit gestures, VAPID, expiration and reconciliation |
| [MDN permission](https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static) | Granted/default/denied states |
| [MDN notificationclick](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/notificationclick_event), [matchAll](https://developer.mozilla.org/en-US/docs/Web/API/Clients/matchAll), [openWindow](https://developer.mozilla.org/en-US/docs/Web/API/Clients/openWindow), [focus](https://developer.mozilla.org/en-US/docs/Web/API/WindowClient/focus), [visibilityState](https://developer.mozilla.org/en-US/docs/Web/API/WindowClient/visibilityState) | Visible-window acknowledgements and safe click destination |
| [MDN installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) and [beforeinstallprompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event) | Feature-detected prompts with manual platform guidance |
| [Supabase Database Webhooks](https://supabase.com/docs/guides/database/webhooks) and [pg_net](https://supabase.com/docs/guides/database/extensions/pgnet) | Async INSERT enqueue rather than blocking provider calls |
| [Supabase secure data](https://supabase.com/docs/guides/database/secure-data), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vault](https://supabase.com/docs/guides/database/vault), [Edge secrets](https://supabase.com/docs/guides/functions/secrets) | Least privilege, sensitive capability rows, server-only keys |
| [Supabase API key migration](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys) | verify_jwt alone is unsuitable for non-JWT webhook credentials; authenticate inside function |
| [Supabase auth event source](https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/src/GoTrueClient.ts) | Synchronous listener is supported; async overload deprecation must not flag its sync sibling |
| [Vercel CDN cache](https://vercel.com/docs/caching/cdn-cache) and [environment configuration](https://vercel.com/docs/environment-variables/manage-across-environments) | Worker no-store policy and build-time public key redeploy |
| [web-push maintained source](https://github.com/web-push-libs/web-push) | 3.6.7 source, Node >=16, per-request VAPID, aes128gcm and stale endpoint classification |

Documentation was retrieved through official documentation connectors and
maintainer documentation repositories, rather than relying on tutorial snippets.
The current maintained web-push source version is 3.6.7; GitHub's latest published
release record still names 3.6.5, so package/runtime validation is also required.

## Compatibility and review notes

The installed next-intl 4.13.7 deprecates the baseline setRequestLocale calls.
Removed redundant page calls and pass the validated locale explicitly to layout
getMessages/getTimeZone. Existing request configuration, prefix routing, middleware,
and client provider remain in place. See [maintainer guidance](https://next-intl.dev/blog/nextjs-root-params)
for the API transition; this feature does not migrate the entire routing architecture.

Review fixed immutable ownership with column grants, provider-host allowlists,
conditional stale cleanup, strict UUID/message validation, a fixed click URL,
user-switch invalidation, failed-registration rollback, blocked-device reset UX,
and overload-aware deprecated API checking. Next Server Actions retain built-in
same-origin checks. No full provider errors or capability URLs are logged.

Concurrent registration retries a uniqueness conflict only when RLS exposes an
own-device row; it never takes over a different Admin's endpoint.

Opening the app with an absent/expired INITIAL_SESSION also clears any prior
browser push capability. An already closed app cannot run authenticated session
cleanup; provider invalidation/reconciliation happens on the next app visit.

## Deployment acceptance status

The first complete automated run passed all validation steps, 596 unit tests,
all 122 local pgTAP assertions, Deno check, and the headless Chromium production
build smoke: [CI run 37091385634](https://github.com/mohammed7779948484-tech/Kisok_nextjs/actions/runs/37091385634).
Subsequent review adds registration-race and expired-session regression coverage;
the PR's latest required checks provide the final results.

The additive production migration and order-push Edge Function version 2 are
deployed. The function source was retrieved and compared byte-for-byte with
repository index.ts/core.js. Migration SQL was compared byte-for-byte with the
remote recorded statements. Production business-row counts remain unchanged.
No existing production business data was modified.

Push Vault configuration is absent, so the trigger is inert. VAPID/Edge secrets
and the Vercel public build key still require configuration through a trusted
operator terminal/Dashboard: the connected tools expose neither secret-setting
API. Do not enable the Vault URL before those values and application deployment
are ready. The production application remains on the verified baseline; feature
previews are available through [draft PR #11](https://github.com/mohammed7779948484-tech/Kisok_nextjs/pull/11).

Real installed-device permission, OS background/closed delivery, two physical
devices, and standalone authentication/session acceptance have not been verified.
Headless Chromium verifies install infrastructure, worker registration, PNG
assets and no-cache behavior; unit/VM tests verify permission and push logic.
No production orders were created to simulate those acceptance cases.
