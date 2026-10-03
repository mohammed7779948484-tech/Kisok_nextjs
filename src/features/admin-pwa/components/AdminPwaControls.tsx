'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { env } from '@/lib/env';
import { KisokButton } from '@/shared/ui';

import {
  disableDeviceNotifications,
  pushSupported,
  reconcileDevice,
  registerWorker,
  rememberDeviceOwner,
} from '../lib/device';
import {
  clearInstallPrompt,
  getInstallPrompt,
  getServerInstallPrompt,
  isInstalled,
  isIOS,
  subscribeInstall,
} from '../lib/install';
import { enableSubscription } from '../lib/subscription';
import { registerDeviceSubscription } from '../server/actions';

type DeviceState = 'checking' | 'enabled' | 'disabled' | 'blocked' | 'unsupported' | 'unconfigured';

export function AdminPwaControls({ userId, locale }: { userId: string; locale: string }) {
  const installPrompt = useSyncExternalStore(
    subscribeInstall,
    getInstallPrompt,
    getServerInstallPrompt,
  );
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [state, setState] = useState<DeviceState>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setInstalled(isInstalled());
    setIos(isIOS());
    if (!pushSupported()) {
      setState('unsupported');
      return;
    }
    if (!env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY) {
      setState('unconfigured');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('blocked');
      return;
    }
    try {
      const subscription = await reconcileDevice(userId, locale);
      setState(subscription ? 'enabled' : 'disabled');
      setError(null);
    } catch {
      setState('disabled');
      setError('Device registration could not be refreshed. Enable notifications to retry.');
    }
  }, [userId, locale]);

  useEffect(() => {
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'KISOK_SUBSCRIPTION_CHANGED') void refresh();
    };
    const onInstalled = () => setInstalled(true);
    document.addEventListener('visibilitychange', onVisible);
    navigator.serviceWorker?.addEventListener('message', onMessage);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [refresh]);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (state === 'enabled') {
        await disableDeviceNotifications();
        setState('disabled');
      } else {
        // Permission is requested synchronously from the click, before registration work.
        const permission = Notification.permission;
        const permissionResult =
          permission === 'default' ? Notification.requestPermission() : Promise.resolve(permission);
        const granted = await permissionResult;
        const registration = await registerWorker();
        await reconcileDevice(userId, locale);
        await enableSubscription({
          permission: granted,
          requestPermission: () => Notification.requestPermission(),
          manager: registration.pushManager,
          publicKey: env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ?? '',
          persist: async (subscription) => {
            await registerDeviceSubscription(subscription, locale);
            rememberDeviceOwner(userId);
          },
        });
        setState('enabled');
      }
    } catch (cause) {
      if (Notification.permission === 'denied') setState('blocked');
      setError(cause instanceof Error ? cause.message : 'Device notifications could not be changed.');
    } finally {
      setBusy(false);
    }
  }

  async function install() {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
    } catch {
      setError('Installation could not be opened. Use your browser install menu.');
    } finally {
      clearInstallPrompt();
    }
  }

  return (
    <section aria-label="KISOK installation and device notifications" className="mt-6 grid gap-3">
      {!installed && installPrompt ? (
        <KisokButton onClick={install} size="sm" type="button" variant="quiet">
          Install KISOK
        </KisokButton>
      ) : null}
      {!installed && !installPrompt ? (
        <p className="text-muted-foreground text-xs">
          {ios
            ? 'Install KISOK: Share → Add to Home Screen. Open that app to enable device notifications.'
            : 'Install KISOK using your browser install menu, when available.'}
        </p>
      ) : null}
      <KisokButton
        disabled={busy || !['enabled', 'disabled'].includes(state)}
        onClick={toggle}
        size="sm"
        type="button"
        variant="quiet"
      >
        {busy
          ? 'Updating device…'
          : state === 'enabled'
            ? 'Disable device notifications'
            : 'Enable device notifications'}
      </KisokButton>
      <p aria-live="polite" className="text-muted-foreground text-xs">
        Device notifications: {state}
        {state === 'blocked' ? '. Allow notifications in your browser settings.' : ''}
        {state === 'unsupported' && ios ? '. Requires an installed Home Screen app on iOS 16.4+.' : ''}
      </p>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
