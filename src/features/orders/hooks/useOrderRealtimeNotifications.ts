'use client';

import { useCallback, useEffect, useState } from 'react';

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

  const dismissLatest = useCallback(() => {
    setLatestOrder(null);
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
    setLatestOrder(null);
  }, []);

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

          setUnreadCount((prev) => prev + 1);
          setLatestOrder(order);

          if (soundEnabled) {
            playOrderChime();
          }

          onNewOrder?.(order);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [soundEnabled, onNewOrder]);

  return {
    unreadCount,
    latestOrder,
    dismissLatest,
    markAllRead,
  };
}
