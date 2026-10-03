import { env } from '@/lib/env';

import { registerDeviceSubscription, removeDeviceSubscription } from '../server/actions';
import { applicationServerKey, disableSubscription } from './subscription';

const OWNER_KEY = 'kisok_push_owner';
let pendingRemoval: string | null = null;

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function registerWorker() {
  if (!('serviceWorker' in navigator)) throw new Error('Service workers are unavailable.');
  await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
  return navigator.serviceWorker.ready;
}

export async function reconcileDevice(userId: string, locale: string) {
  const registration = await registerWorker();
  const subscription = await registration.pushManager.getSubscription();
  const owner = localStorage.getItem(OWNER_KEY);
  if (subscription && owner !== userId) {
    await subscription.unsubscribe();
    localStorage.removeItem(OWNER_KEY);
    return null;
  }
  if (subscription) {
    const key = env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    const existingKey = subscription.options.applicationServerKey;
    const expected = key ? applicationServerKey(key) : null;
    if (
      existingKey &&
      expected &&
      (existingKey.byteLength !== expected.byteLength ||
        new Uint8Array(existingKey).some((byte, index) => byte !== expected[index]))
    ) {
      await disableSubscription(subscription, removeDeviceSubscription);
      return null;
    }
    await registerDeviceSubscription(subscription.toJSON(), locale);
  }
  return subscription;
}

export function rememberDeviceOwner(userId: string) {
  localStorage.setItem(OWNER_KEY, userId);
}

export async function disableDeviceNotifications() {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager?.getSubscription();
  if (subscription) {
    pendingRemoval = subscription.endpoint;
    await disableSubscription(subscription, removeDeviceSubscription);
    pendingRemoval = null;
  } else if (pendingRemoval) {
    await removeDeviceSubscription(pendingRemoval);
    pendingRemoval = null;
  }
  localStorage.removeItem(OWNER_KEY);
}

export async function clearLocalDevice() {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager?.getSubscription();
  await subscription?.unsubscribe();
  localStorage.removeItem(OWNER_KEY);
}
