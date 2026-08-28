'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { BellIcon, BellOffIcon } from 'lucide-react';

import { KisokButton, StatusPill } from '@/shared/ui';

import type { IncomingOrderNotification } from '../hooks/useOrderRealtimeNotifications';

const SOUND_PREFERENCE_KEY = 'kisok_admin_sound_enabled';

export interface OrderNotificationCenterProps {
  latestOrder?: IncomingOrderNotification | null;
  locale: string;
  onDismiss?: () => void;
  onSoundChange?: (enabled: boolean) => void;
}

export function OrderNotificationCenter({
  latestOrder,
  locale,
  onDismiss,
  onSoundChange,
}: OrderNotificationCenterProps) {
  const router = useRouter();
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SOUND_PREFERENCE_KEY);
      if (stored !== null) {
        const isEnabled = stored === 'true';
        setSoundEnabled(isEnabled);
        onSoundChange?.(isEnabled);
      }
    } catch {
      // Ignore localStorage access failures in restricted environments
    }
  }, [onSoundChange]);

  function toggleSound() {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_PREFERENCE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      onSoundChange?.(next);
      return next;
    });
  }

  function handleViewOrder() {
    onDismiss?.();
    router.push(`/${locale}/admin/orders`);
  }

  return (
    <>
      {/* Sound Toggle Control in header */}
      <KisokButton
        aria-label={soundEnabled ? 'Mute notification sound' : 'Unmute notification sound'}
        onClick={toggleSound}
        size="sm"
        type="button"
        variant="quiet"
      >
        <span className="flex items-center gap-1.5 font-mono text-xs">
          {soundEnabled ? (
            <BellIcon aria-hidden="true" className="size-3.5" />
          ) : (
            <BellOffIcon aria-hidden="true" className="size-3.5" />
          )}
          <span className="hidden sm:inline">{soundEnabled ? 'Sound ON' : 'Sound OFF'}</span>
        </span>
      </KisokButton>

      {/* Floating Incoming Order Toast */}
      {latestOrder ? (
        <aside
          aria-live="polite"
          className="fixed top-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] flex-col gap-3 rounded-2xl border border-primary/35 bg-card p-4 shadow-overlay ring-1 ring-primary/15 backdrop-blur-md transition-all motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4 sm:max-w-sm"
          role="status"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-2.5 rounded-full bg-success motion-safe:animate-pulse" />
              <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Incoming Order
              </p>
            </div>
            <StatusPill tone="success">New</StatusPill>
          </div>

          <div>
            <h3 className="font-bold text-foreground text-base tracking-tight">
              New order {latestOrder.displayNumber}
            </h3>
            <p className="mt-0.5 text-muted-foreground text-xs">
              A new operational order was placed just now.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-border/50 border-t pt-2.5">
            <KisokButton
              aria-label="Dismiss notification"
              onClick={onDismiss}
              size="sm"
              variant="quiet"
            >
              Dismiss
            </KisokButton>
            <KisokButton aria-label="View in queue" onClick={handleViewOrder} size="sm">
              View in queue
            </KisokButton>
          </div>
        </aside>
      ) : null}
    </>
  );
}
