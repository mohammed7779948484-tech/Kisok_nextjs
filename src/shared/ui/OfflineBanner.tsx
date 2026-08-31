'use client';

import { useEffect, useState } from 'react';

import { WifiOffIcon } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleOnline() {
      setIsOffline(false);
    }

    function handleOffline() {
      setIsOffline(true);
    }

    setIsOffline(!window.navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <aside
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-warning/30 bg-warning px-4 py-2 text-center text-xs font-semibold text-warning-foreground shadow-sm"
      role="status"
    >
      <WifiOffIcon aria-hidden="true" className="size-4 shrink-0" />
      <span>
        You are currently offline. Product changes and stock updates will not save until your
        internet connection is restored.
      </span>
    </aside>
  );
}
