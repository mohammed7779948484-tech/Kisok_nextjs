'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getBrowserSupabaseClient } from '@/infrastructure/supabase/client/browser-client';
import type { Database } from '@/infrastructure/supabase/database.types';

import { playOrderChime } from '../lib/sound';
import type { OrderStatus } from '../types';

export interface IncomingOrderNotification {
  id: string;
  displayNumber: string;
  status: OrderStatus;
  createdAt: string;
}

export interface UseOrderRealtimeNotificationsOptions {
  soundEnabled?: boolean;
  onNewOrder?: (order: IncomingOrderNotification) => void;
}

export function useOrderRealtimeNotifications(options: UseOrderRealtimeNotificationsOptions = {}) {
  const { soundEnabled = true, onNewOrder } = options;
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestOrder, setLatestOrder] = useState<IncomingOrderNotification | null>(null);
  const seenOrderIds = useRef(new Set<string>());
  const audioContextRef = useRef<AudioContext | null>(null);

  const dismissLatest = useCallback(() => {
    setLatestOrder(null);
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
    setLatestOrder(null);
  }, []);

  // One AudioContext for the life of the admin session, created lazily on the
  // first notification instead of `playOrderChime` constructing (and
  // leaking) a fresh one per order — browsers cap how many can exist at once.
  const getAudioContext = useCallback((): AudioContext | null => {
    if (audioContextRef.current) {
      return audioContextRef.current;
    }
    if (typeof window === 'undefined') {
      return null;
    }
    const AudioCtxConstructor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxConstructor) {
      return null;
    }
    try {
      audioContextRef.current = new AudioCtxConstructor();
      return audioContextRef.current;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      try {
        audioContextRef.current?.close();
      } catch {
        // Best-effort cleanup — a context already closed or unsupported
        // teardown must never crash unmount.
      }
      audioContextRef.current = null;
    };
  }, []);

  const receiveOrder = useCallback(
    (order: IncomingOrderNotification) => {
      if (seenOrderIds.current.has(order.id)) return;
      seenOrderIds.current.add(order.id);
      if (seenOrderIds.current.size > 256) {
        const oldest = seenOrderIds.current.values().next().value;
        if (oldest) seenOrderIds.current.delete(oldest);
      }
      setUnreadCount((prev) => prev + 1);
      setLatestOrder(order);
      if (soundEnabled && document.visibilityState === 'visible') {
        playOrderChime(getAudioContext() ?? undefined);
      }
      onNewOrder?.(order);
    },
    [soundEnabled, getAudioContext, onNewOrder],
  );

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onPush = (event: MessageEvent) => {
      const order = event.data?.order;
      if (
        document.visibilityState !== 'visible' ||
        event.data?.type !== 'KISOK_FOREGROUND_ORDER' ||
        typeof order?.id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id) ||
        !/^[A-HJ-NP-Z2-9]{6}$/.test(order.displayNumber) ||
        !Number.isFinite(Date.parse(order.createdAt))
      ) {
        return;
      }
      receiveOrder({ ...order, status: 'new' });
      event.ports[0]?.postMessage({ handled: true });
    };
    navigator.serviceWorker.addEventListener('message', onPush);
    return () => navigator.serviceWorker.removeEventListener('message', onPush);
  }, [receiveOrder]);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      return;
    }

    const channel = supabase.channel('orders-realtime-channel');

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const row = payload.new as Database['public']['Tables']['orders']['Row'];
          const order: IncomingOrderNotification = {
            id: row.id,
            displayNumber: row.display_number,
            status: row.status,
            createdAt: row.created_at,
          };

          receiveOrder(order);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [receiveOrder]);

  return {
    unreadCount,
    latestOrder,
    dismissLatest,
    markAllRead,
  };
}
