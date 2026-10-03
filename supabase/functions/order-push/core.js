const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseWebhook(payload) {
  if (
    payload?.type !== 'INSERT' ||
    payload.schema !== 'public' ||
    payload.table !== 'orders' ||
    !UUID.test(payload.record?.id) ||
    !/^[A-HJ-NP-Z2-9]{6}$/.test(payload.record?.display_number) ||
    !Number.isFinite(Date.parse(payload.record?.created_at))
  ) {
    return null;
  }
  return payload.record;
}

export function safeEndpoint(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      (['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'].includes(
        url.hostname,
      ) ||
        /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname))
    );
  } catch {
    return false;
  }
}

export async function secretMatches(supplied, expected) {
  if (!(supplied && expected) || expected.length < 32 || supplied.length > 256) return false;
  const encode = new TextEncoder();
  const [left, right] = await Promise.all(
    [supplied, expected].map((value) => crypto.subtle.digest('SHA-256', encode.encode(value))),
  );
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

export async function deliverBatch(subscriptions, payload, send, remove, concurrency = 5) {
  const results = { sent: 0, stale: 0, transient: 0, rejected: 0, cleanupFailed: 0 };
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, subscriptions.length) }, async () => {
      while (cursor < subscriptions.length) {
        const subscription = subscriptions[cursor++];
        if (!safeEndpoint(subscription.endpoint)) {
          results.rejected++;
          continue;
        }
        try {
          await send(subscription, payload);
          results.sent++;
        } catch (error) {
          const status = error?.statusCode;
          if (status === 404 || status === 410) {
            results.stale++;
            try {
              await remove(subscription);
            } catch {
              results.cleanupFailed++;
            }
          } else if (!status || status === 429 || status >= 500) {
            results.transient++;
          } else {
            results.rejected++;
          }
        }
      }
    }),
  );
  return results;
}
