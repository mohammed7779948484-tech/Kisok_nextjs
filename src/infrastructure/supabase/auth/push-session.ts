import { clearLocalDevice } from '@/features/admin-pwa/lib/device';
import { logger } from '@/lib/logger';

import { getBrowserSupabaseClient } from '../client/browser-client';

export function watchPushSession() {
  const client = getBrowserSupabaseClient();
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
      void clearLocalDevice().catch(() => {
        logger.warn('Local push cleanup failed after session ended');
      });
    }
  });
  return () => data.subscription.unsubscribe();
}
