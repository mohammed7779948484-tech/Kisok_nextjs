type DeviceSubscription = {
  endpoint: string;
  toJSON: () => PushSubscriptionJSON;
  unsubscribe: () => Promise<boolean>;
};

type SubscriptionManager = {
  getSubscription: () => Promise<DeviceSubscription | null>;
  subscribe: (options: PushSubscriptionOptionsInit) => Promise<DeviceSubscription>;
};

export function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function enableSubscription({
  permission,
  requestPermission,
  manager,
  publicKey,
  persist,
}: {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  manager: SubscriptionManager;
  publicKey: string;
  persist: (subscription: PushSubscriptionJSON) => Promise<void>;
}) {
  const granted = permission === 'default' ? await requestPermission() : permission;
  if (granted === 'denied')
    throw new Error('Device notifications are blocked in browser settings.');
  if (granted !== 'granted') throw new Error('Notification permission was not granted.');
  const existing = await manager.getSubscription();
  const subscription =
    existing ??
    (await manager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(publicKey),
    }));
  try {
    await persist(subscription.toJSON());
    return subscription;
  } catch (error) {
    if (!existing) await subscription.unsubscribe();
    throw error;
  }
}

export async function disableSubscription(
  subscription: DeviceSubscription,
  remove: (endpoint: string) => Promise<void>,
) {
  await subscription.unsubscribe();
  await remove(subscription.endpoint);
}
