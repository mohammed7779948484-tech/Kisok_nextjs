import { deliverBatch, parseWebhook, signatureMatches } from './core.js';

import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import webpush from 'npm:web-push@3.6.7';

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error('Push configuration missing');
  return value;
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8192) {
          await reader.cancel();
          return new Response('Payload too large', { status: 413 });
        }
        chunks.push(value);
      }
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder().decode(bytes);
    if (!(await signatureMatches(
      request.headers.get('x-kisok-webhook-signature'),
      text,
      Deno.env.get('ORDER_PUSH_WEBHOOK_SECRET'),
    ))) {
      return new Response('Unauthorized', { status: 401 });
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }
    const record = parseWebhook(payload);
    if (!record) return new Response('Invalid order INSERT webhook', { status: 400 });

    const publicKey = required('WEB_PUSH_VAPID_PUBLIC_KEY');
    const privateKey = required('WEB_PUSH_VAPID_PRIVATE_KEY');
    const subject = required('WEB_PUSH_VAPID_SUBJECT');
    if (
      !(
        /^[A-Za-z0-9_-]{87}$/.test(publicKey) &&
        /^[A-Za-z0-9_-]{43}$/.test(privateKey) &&
        /^(mailto:[^\s@]+@[^\s@]+\.[^\s@]+|https:\/\/[^\s]+)$/.test(subject)
      )
    ) {
      throw new Error('Push configuration invalid');
    }
    const client = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Authenticate the event against the source of truth; never accept arbitrary lock-screen content.
    const { data: order, error: orderError } = await client
      .from('orders')
      .select('id,display_number,created_at')
      .eq('id', record.id)
      .maybeSingle();
    if (orderError) throw new Error('Order lookup failed');
    if (
      !order ||
      order.display_number !== record.display_number ||
      Date.parse(order.created_at) !== Date.parse(record.created_at) ||
      Date.now() - Date.parse(order.created_at) > 300_000
    ) {
      return new Response('Event ignored', { status: 202 });
    }

    const { error: claimError } = await client
      .from('push_delivery_claims')
      .insert({ order_id: order.id });
    if (claimError?.code === '23505') return new Response('Event already claimed', { status: 202 });
    if (claimError) throw new Error('Delivery claim failed');

    const message = JSON.stringify({
      type: 'KISOK_ORDER',
      orderId: order.id,
      displayNumber: order.display_number,
      createdAt: order.created_at,
    });
    const totals = { sent: 0, stale: 0, transient: 0, rejected: 0, cleanupFailed: 0, targets: 0 };
    const started = Date.now();
    let after: string | null = null;
    let limited = false;
    for (let page = 0; page < 100; page++) {
      if (Date.now() - started > 45_000) {
        limited = true;
        break;
      }
      let query = client
        .from('push_subscriptions')
        .select('id,endpoint,p256dh,auth,updated_at,profiles!inner(role,is_active)')
        .eq('profiles.role', 'admin')
        .eq('profiles.is_active', true)
        .eq('vapid_public_key', publicKey)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('id')
        .limit(100);
      if (after) query = query.gt('id', after);
      const { data: subscriptions, error } = await query;
      if (error) throw new Error('Subscription lookup failed');
      if (!subscriptions?.length) break;
      totals.targets += subscriptions.length;
      const results = await deliverBatch(
        subscriptions,
        message,
        async (subscription: { endpoint: string; p256dh: string; auth: string }) => {
          const details = webpush.generateRequestDetails(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            message,
            {
              vapidDetails: { subject, publicKey, privateKey },
              TTL: 300,
              urgency: 'high',
              timeout: 5000,
            },
          );
          const response = await fetch(details.endpoint, {
            method: details.method,
            headers: details.headers,
            body: details.body,
            redirect: 'error',
            signal: AbortSignal.timeout(5000),
          });
          await response.body?.cancel();
          if (!response.ok) {
            throw Object.assign(new Error('Push provider error'), { statusCode: response.status });
          }
        },
        async (subscription: { id: string; updated_at: string }) => {
          const { error: cleanupError } = await client
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id)
            .eq('updated_at', subscription.updated_at);
          if (cleanupError) throw new Error('Stale subscription cleanup failed');
        },
      );
      for (const key of ['sent', 'stale', 'transient', 'rejected', 'cleanupFailed'] as const) {
        totals[key] += results[key];
      }
      after = subscriptions[subscriptions.length - 1].id;
      if (subscriptions.length < 100) break;
      if (page === 99) limited = true;
    }
    console.info(JSON.stringify({ orderId: order.id, ...totals, limited }));
    return Response.json({ ...totals, limited });
  } catch {
    // Do not serialize provider errors: they contain sensitive endpoint URLs and request headers.
    console.error('KISOK order push delivery failed');
    return new Response('Delivery failed', { status: 503 });
  }
});
