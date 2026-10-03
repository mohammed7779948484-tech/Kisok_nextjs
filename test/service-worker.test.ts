import { describe, expect, it, vi } from 'vitest';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const source = readFileSync(resolve(import.meta.dirname, '../public/sw.js'), 'utf8');

function worker(visible = false, webkit = false, acknowledge = true) {
  const handlers: Record<string, (event: any) => void> = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const focus = vi.fn().mockResolvedValue(undefined);
  const navigate = vi.fn().mockResolvedValue({ focus });
  const client = {
    url: 'https://kisok-omega.vercel.app/en/admin',
    visibilityState: visible ? 'visible' : 'hidden',
    focused: visible,
    navigate,
    postMessage: vi.fn((_data, ports) => {
      if (acknowledge) ports[0].reply({ handled: true });
    }),
  };
  const self = {
    addEventListener: (type: string, callback: (event: any) => void) => {
      handlers[type] = callback;
    },
    location: { origin: 'https://kisok-omega.vercel.app' },
    navigator: { userAgent: webkit ? 'AppleWebKit Safari' : 'Chrome' },
    clients: { matchAll: vi.fn().mockResolvedValue([client]), openWindow },
    registration: { showNotification },
  };
  class Channel {
    port1 = { onmessage: null as any, close: vi.fn() };
    port2 = { reply: (data: unknown) => this.port1.onmessage?.({ data }) };
  }
  runInNewContext(source, { self, URL, MessageChannel: Channel, setTimeout, clearTimeout });
  const order = {
    type: 'KISOK_ORDER',
    orderId: '12345678-1234-1234-1234-123456789abc',
    displayNumber: 'ABC234',
    createdAt: '2026-10-03T00:00:00Z',
  };
  const push = async (payload: unknown = order) => {
    let pending = Promise.resolve();
    handlers.push({
      data: { json: () => payload },
      waitUntil: (promise: Promise<void>) => {
        pending = promise;
      },
    });
    await pending;
  };
  return { handlers, push, showNotification, openWindow, client, navigate, focus, self };
}

describe('order service worker', () => {
  it('shows minimal tagged notifications for background clients', async () => {
    const context = worker();
    await context.push();
    expect(context.showNotification).toHaveBeenCalledWith(
      'KISOK — New Order',
      expect.objectContaining({
        tag: 'order:12345678-1234-1234-1234-123456789abc',
        data: { url: '/en/admin/orders' },
        silent: false,
      }),
    );
  });

  it('suppresses OS display only after a visible Admin acknowledges the order', async () => {
    const context = worker(true);
    await context.push();
    expect(context.client.postMessage).toHaveBeenCalled();
    expect(context.showNotification).not.toHaveBeenCalled();
  });

  it('uses silent foreground notification on WebKit', async () => {
    const context = worker(true, true);
    await context.push();
    expect(context.showNotification).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ silent: true }),
    );
  });

  it('falls back to OS delivery if foreground does not acknowledge', async () => {
    const context = worker(true, false, false);
    await context.push();
    expect(context.showNotification).toHaveBeenCalledOnce();
  });

  it('does not display malformed payloads', async () => {
    const context = worker();
    await context.push({ type: 'KISOK_ORDER', displayNumber: '<script>' });
    expect(context.showNotification).not.toHaveBeenCalled();
  });

  it('uses a fixed same-origin Orders destination despite injected notification data', async () => {
    const context = worker();
    const close = vi.fn();
    let pending = Promise.resolve();
    context.handlers.notificationclick({
      notification: { close, data: { url: 'https://attacker.test/' } },
      waitUntil: (promise: Promise<void>) => {
        pending = promise;
      },
    });
    await pending;
    expect(close).toHaveBeenCalledOnce();
    expect(context.navigate).toHaveBeenCalledWith('https://kisok-omega.vercel.app/en/admin/orders');
    expect(context.focus).toHaveBeenCalledOnce();
    expect(context.openWindow).not.toHaveBeenCalled();
  });

  it('opens Orders when no Admin window is available', async () => {
    const context = worker();
    context.self.clients.matchAll.mockResolvedValue([]);
    let pending = Promise.resolve();
    context.handlers.notificationclick({
      notification: { close: vi.fn() },
      waitUntil: (promise: Promise<void>) => {
        pending = promise;
      },
    });
    await pending;
    expect(context.openWindow).toHaveBeenCalledWith(
      'https://kisok-omega.vercel.app/en/admin/orders',
    );
  });

  it('does not install a fetch handler or business-data cache', () => {
    expect(worker().handlers.fetch).toBeUndefined();
    expect(source).not.toMatch(/caches\.open|cache\.put/);
  });
});
