'use server';

import { headers } from 'next/headers';

import { getTrustedAdminSession } from '@/infrastructure/supabase/auth/server';
import { getServerSupabaseClient } from '@/infrastructure/supabase/client/server-client';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

import { subscriptionSchema } from './schema';

export async function registerDeviceSubscription(input: unknown, locale: string): Promise<void> {
  const client = await getServerSupabaseClient();
  const session = await getTrustedAdminSession(client);
  if (!(client && session)) throw new Error('Sign in as an active Admin to enable notifications.');
  const parsed = subscriptionSchema.safeParse(input);
  const publicKey = env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  if (!parsed.success || locale !== 'en' || !publicKey || !/^[A-Za-z0-9_-]{87}$/.test(publicKey)) {
    throw new Error('Device notification configuration or subscription is invalid.');
  }
  const subscription = parsed.data;
  const requestHeaders = await headers();
  const values = {
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    vapid_public_key: publicKey,
    locale,
    expires_at: subscription.expirationTime
      ? new Date(subscription.expirationTime).toISOString()
      : null,
    user_agent: requestHeaders.get('user-agent')?.slice(0, 512) ?? null,
  };
  const { data: existing, error: readError } = await client
    .from('push_subscriptions')
    .select('id')
    .eq('endpoint', subscription.endpoint)
    .maybeSingle();
  if (readError) throw new Error('Device notification registration could not be checked.');
  const result = existing
    ? await client
        .from('push_subscriptions')
        .update({ ...values, last_seen_at: new Date().toISOString() })
        .eq('id', existing.id)
    : await client.from('push_subscriptions').insert({
        ...values,
        endpoint: subscription.endpoint,
        user_id: session.userId,
      });
  if (result.error) {
    logger.warn({ code: result.error.code }, 'Device push registration failed');
    throw new Error('Device notifications could not be saved. Disable and enable them again.');
  }
}

export async function removeDeviceSubscription(endpoint: string): Promise<void> {
  const client = await getServerSupabaseClient();
  if (!client) throw new Error('Notification service is unavailable.');
  const { data, error: authError } = await client.auth.getClaims();
  const userId = data?.claims?.sub;
  if (authError || typeof userId !== 'string') throw new Error('Sign in to remove this device.');
  if (typeof endpoint !== 'string' || endpoint.length > 2048) {
    throw new Error('Invalid device subscription.');
  }
  const { error } = await client
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', userId);
  if (error) throw new Error('Device notification registration could not be removed.');
}
