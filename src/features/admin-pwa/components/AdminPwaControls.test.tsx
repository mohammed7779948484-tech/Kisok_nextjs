import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const context = vi.hoisted(() => ({
  supported: true,
  ios: false,
  installed: false,
  existing: null as any,
  reconcile: vi.fn(),
  register: vi.fn(),
  remember: vi.fn(),
  disable: vi.fn(),
  prompt: null as any,
  subscribe: vi.fn(),
}));
vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY: 'B'.repeat(87) },
}));
vi.mock('../lib/device', () => ({
  pushSupported: () => context.supported,
  reconcileDevice: context.reconcile,
  registerWorker: async () => ({
    pushManager: {
      getSubscription: async () => context.existing,
      subscribe: context.subscribe,
    },
  }),
  rememberDeviceOwner: context.remember,
  disableDeviceNotifications: context.disable,
}));
vi.mock('../lib/install', () => ({
  subscribeInstall: () => () => {},
  getInstallPrompt: () => context.prompt,
  getServerInstallPrompt: () => null,
  clearInstallPrompt: vi.fn(),
  isInstalled: () => context.installed,
  isIOS: () => context.ios,
}));
vi.mock('../server/actions', () => ({ registerDeviceSubscription: context.register }));

import { AdminPwaControls } from './AdminPwaControls';

describe('Admin PWA controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    context.supported = true;
    context.ios = false;
    context.installed = false;
    context.existing = null;
    context.prompt = null;
    context.reconcile.mockResolvedValue(null);
    context.register.mockResolvedValue(undefined);
    context.subscribe.mockResolvedValue({
      toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/device' }),
      unsubscribe: vi.fn(),
    });
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('requests permission only after an explicit enable click', async () => {
    render(<AdminPwaControls locale="en" userId="admin" />);
    const button = screen.getByRole('button', { name: 'Enable device notifications' });
    await waitFor(() => expect(button).toBeEnabled());
    expect(Notification.requestPermission).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(context.register).toHaveBeenCalledOnce());
    expect(Notification.requestPermission).toHaveBeenCalledOnce();
    expect(context.remember).toHaveBeenCalledWith('admin');
  });

  it('explains blocked permission without a clickable broken enable control', async () => {
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission: vi.fn() });
    render(<AdminPwaControls locale="en" userId="admin" />);
    await screen.findByText(/notifications: blocked/);
    expect(screen.getByRole('button', { name: 'Enable device notifications' })).toBeDisabled();
    expect(Notification.requestPermission).not.toHaveBeenCalled();
  });

  it('provides iOS installation guidance when push is unsupported', async () => {
    context.supported = false;
    context.ios = true;
    render(<AdminPwaControls locale="en" userId="admin" />);
    expect(await screen.findByText(/Share → Add to Home Screen/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install KISOK' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable device notifications' })).toBeDisabled();
  });

  it('offers native install only when an actual prompt exists', () => {
    context.prompt = { prompt: vi.fn().mockResolvedValue({ outcome: 'accepted' }) };
    render(<AdminPwaControls locale="en" userId="admin" />);
    fireEvent.click(screen.getByRole('button', { name: 'Install KISOK' }));
    expect(context.prompt.prompt).toHaveBeenCalledOnce();
  });

  it('keeps a failed registration visible and does not claim Enabled', async () => {
    context.register.mockRejectedValue(new Error('Registration unavailable'));
    render(<AdminPwaControls locale="en" userId="admin" />);
    const button = screen.getByRole('button', { name: 'Enable device notifications' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('Registration unavailable');
    expect(context.remember).not.toHaveBeenCalled();
  });
});
