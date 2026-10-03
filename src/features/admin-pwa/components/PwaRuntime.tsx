'use client';

import { useEffect } from 'react';

import { watchPushSession } from '@/infrastructure/supabase/auth/push-session';
import { logger } from '@/lib/logger';

import { registerWorker } from '../lib/device';
import { listenForInstall } from '../lib/install';

export function PwaRuntime() {
  useEffect(() => {
    const stopInstall = listenForInstall();
    const stopSession = watchPushSession();
    if ('serviceWorker' in navigator && window.isSecureContext) {
      void registerWorker().catch(() => {
        logger.warn('KISOK service worker registration failed');
      });
    }
    return () => {
      stopInstall();
      stopSession();
    };
  }, []);
  return null;
}
