'use strict';

self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// There is deliberately no fetch handler or offline data cache.
function parseOrder(data) {
  try {
    const order = data?.json();
    if (
      order?.type !== 'KISOK_ORDER' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.orderId) ||
      !/^[A-HJ-NP-Z2-9]{6}$/.test(order.displayNumber) ||
      !Number.isFinite(Date.parse(order.createdAt))
    ) return null;
    return {
      id: order.orderId,
      displayNumber: order.displayNumber,
      createdAt: order.createdAt,
      status: 'new',
    };
  } catch {
    return null;
  }
}

function adminClient(client) {
  const url = new URL(client.url);
  return url.origin === self.location.origin && /^\/en\/admin(?:\/|$)/.test(url.pathname);
}

function acknowledged(client, order) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      resolve(false);
    }, 800);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(event.data?.handled === true);
    };
    try {
      client.postMessage({ type: 'KISOK_FOREGROUND_ORDER', order }, [channel.port2]);
    } catch {
      clearTimeout(timer);
      channel.port1.close();
      resolve(false);
    }
  });
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    const order = parseOrder(event.data);
    if (!order) return;
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const visible = clients.filter((client) => adminClient(client) && client.visibilityState === 'visible');
    const handled = (await Promise.all(visible.map((client) => acknowledged(client, order)))).some(Boolean);
    // WebKit requires showNotification for every push; silent foreground display avoids extra sound.
    const webkit = /AppleWebKit/.test(self.navigator.userAgent) &&
      !/Chrome|Chromium|Edg|OPR/.test(self.navigator.userAgent);
    if (handled && !webkit) return;
    await self.registration.showNotification('KISOK — New Order', {
      body: `Order #${order.displayNumber} has arrived. Tap to open the Orders queue.`,
      icon: '/pwa-icons/192.png',
      badge: '/pwa-icons/badge.png',
      tag: `order:${order.id}`,
      renotify: false,
      silent: handled,
      data: { url: '/en/admin/orders' },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const destination = new URL('/en/admin/orders', self.location.origin).href;
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = clients.filter(adminClient).sort((a, b) => Number(b.focused) - Number(a.focused))[0];
    if (existing) {
      try {
        const navigated = await existing.navigate(destination);
        if (navigated) {
          await navigated.focus();
          return;
        }
      } catch {
        // A closing window must not prevent opening the queue.
      }
    }
    await self.clients.openWindow(destination);
  })());
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients.filter(adminClient)) {
      client.postMessage({ type: 'KISOK_SUBSCRIPTION_CHANGED' });
    }
    // Authenticated persistence is reconciled next time the Admin opens the app.
  })());
});
