import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

import * as core from '../supabase/functions/order-push/core.js';

import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const source = readFileSync(
  resolve(import.meta.dirname, '../supabase/functions/order-push/index.ts'),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function boot(configured = true, claimed = false) {
  const secret = 's'.repeat(64);
  const env: Record<string, string> = configured
    ? {
        ORDER_PUSH_WEBHOOK_SECRET: secret,
        WEB_PUSH_VAPID_PUBLIC_KEY: 'B'.repeat(87),
        WEB_PUSH_VAPID_PRIVATE_KEY: 'A'.repeat(43),
        WEB_PUSH_VAPID_SUBJECT: 'mailto:operator@example.com',
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-only-key',
      }
    : {};
  const from = vi.fn();
  const order = {
    id: '12345678-1234-1234-1234-123456789abc',
    display_number: 'ABC234',
    created_at: new Date().toISOString(),
  };
  from.mockImplementation((table) => {
    const query = Object.assign(Promise.resolve({ data: [], error: null }), {
      insert: vi.fn().mockResolvedValue({ error: claimed ? { code: '23505' } : null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: table === 'orders' ? order : null,
        error: null,
      }),
    });
    return query;
  });
  let handler: ((request: Request) => Promise<Response>) | undefined;
  runInNewContext(compiled, {
    exports: {},
    require: (name: string) => {
      if (name === './core.js') return core;
      if (name.startsWith('npm:@supabase/')) return { createClient: () => ({ from }) };
      if (name.startsWith('npm:web-push')) return { generateRequestDetails: vi.fn() };
      throw new Error('Unexpected import');
    },
    Deno: {
      env: { get: (name: string) => env[name] },
      serve: (callback: typeof handler) => {
        handler = callback;
      },
    },
    console: { info: vi.fn(), error: vi.fn() },
    Request,
    Response,
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    AbortSignal,
    Date,
  });
  if (!handler) throw new Error('Handler was not registered');
  const invokeHandler = handler;
  const invoke = async (payload: unknown, credential: string | null = secret) => {
    const body = JSON.stringify(payload);
    let signature: string | null = null;
    if (credential) {
      const key = await webcrypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(credential),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );
      const digest = await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
      signature = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
    }
    return invokeHandler(
      new Request('https://project.supabase.co/functions/v1/order-push', {
        method: 'POST',
        headers: signature ? { 'x-kisok-webhook-signature': signature } : {},
        body,
      }),
    );
  };
  return {
    invoke,
    from,
    event: { type: 'INSERT', schema: 'public', table: 'orders', record: order },
  };
}

describe('order webhook HTTP boundary', () => {
  it('rejects missing, wrong and unconfigured credentials before any database lookup', async () => {
    const context = boot();
    expect((await context.invoke({}, null)).status).toBe(401);
    expect((await context.invoke({}, 'wrong')).status).toBe(401);
    expect(context.from).not.toHaveBeenCalled();
    expect((await boot(false).invoke({})).status).toBe(401);
  });

  it('rejects malformed events and UPDATE or unrelated table events', async () => {
    const context = boot();
    expect((await context.invoke({})).status).toBe(400);
    expect((await context.invoke({ ...context.event, type: 'UPDATE' })).status).toBe(400);
    expect((await context.invoke({ ...context.event, table: 'profiles' })).status).toBe(400);
    expect(context.from).not.toHaveBeenCalled();
  });

  it('checks the actual order before scanning active devices', async () => {
    const context = boot();
    const response = await context.invoke(context.event);
    expect(response.status).toBe(200);
    expect(context.from.mock.calls.map(([table]) => table)).toEqual([
      'orders',
      'push_delivery_claims',
      'push_subscriptions',
    ]);
    expect(await response.json()).toEqual(expect.objectContaining({ targets: 0, sent: 0 }));
  });

  it('ignores replayed events before scanning subscriptions', async () => {
    const context = boot(true, true);
    expect((await context.invoke(context.event)).status).toBe(202);
    expect(context.from.mock.calls.map(([table]) => table)).toEqual([
      'orders',
      'push_delivery_claims',
    ]);
  });

  it('ignores fabricated order display data', async () => {
    const context = boot();
    const response = await context.invoke({
      ...context.event,
      record: { ...context.event.record, display_number: 'ZZZ234' },
    });
    expect(response.status).toBe(202);
    expect(context.from).toHaveBeenCalledTimes(1);
  });
});
