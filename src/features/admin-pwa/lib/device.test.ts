import { beforeEach, describe, expect, it, vi } from 'vitest';

const context = vi.hoisted(() => ({
  register: vi.fn(),
  remove: vi.fn(),
  subscription: null as any,
}));
vi.mock('../server/actions', () => ({
  registerDeviceSubscription: context.register,
  removeDeviceSubscription: context.remove,
}));
vi.mock('@/lib/env', () => ({ env: { NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY: 'AQID' } }));

import {
  disableDeviceNotifications,
  pushSupported,
  reconcileDevice,
  rememberDeviceOwner,
} from './device';

describe('browser device lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    context.subscription = {
      endpoint: 'https://fcm.googleapis.com/device',
      options: { applicationServerKey: null },
      toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/device' }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    const registration = {
      pushManager: { getSubscription: vi.fn(async () => context.subscription) },
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: vi.fn().mockResolvedValue(registration),
        ready: Promise.resolve(registration),
        getRegistration: vi.fn().mockResolvedValue(registration),
      },
    });
  });

  it('does not transfer a previous account device to a different Admin', async () => {
    rememberDeviceOwner('previous-admin');
    expect(await reconcileDevice('new-admin', 'en')).toBeNull();
    expect(context.subscription.unsubscribe).toHaveBeenCalledOnce();
    expect(context.register).not.toHaveBeenCalled();
  });

  it('refreshes only the same account subscription', async () => {
    rememberDeviceOwner('same-admin');
    expect(await reconcileDevice('same-admin', 'en')).toBe(context.subscription);
    expect(context.register).toHaveBeenCalledWith(context.subscription.toJSON(), 'en');
  });

  it('invalidates a device bound to an old VAPID key', async () => {
    rememberDeviceOwner('same-admin');
    context.subscription.options.applicationServerKey = new Uint8Array([9, 9, 9]).buffer;
    expect(await reconcileDevice('same-admin', 'en')).toBeNull();
    expect(context.subscription.unsubscribe).toHaveBeenCalledOnce();
    expect(context.remove).toHaveBeenCalledWith(context.subscription.endpoint);
  });

  it('removes the browser capability before deleting server registration', async () => {
    rememberDeviceOwner('admin');
    await disableDeviceNotifications();
    expect(context.subscription.unsubscribe).toHaveBeenCalledOnce();
    expect(context.remove).toHaveBeenCalledWith(context.subscription.endpoint);
    expect(localStorage.getItem('kisok_push_owner')).toBeNull();
  });

  it('detects missing browser notification support', () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
    expect(pushSupported()).toBe(false);
  });
});
