'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { Button, buttonVariants } from '@/components/ui/button';
import { OrderNotificationCenter, useOrderRealtimeNotifications } from '@/features/orders';
import { signOutCurrentUser } from '@/infrastructure/supabase/auth/browser';
import { StatusPill } from '@/shared/ui';

const navigation = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/catalog/brands', label: 'Brands' },
  { href: '/admin/catalog/categories', label: 'Categories' },
  { href: '/admin/catalog/options', label: 'Option library' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/media', label: 'Media' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/settings', label: 'Settings' },
] as const;

export function AdminShell({
  children,
  displayName,
  locale,
}: {
  children: React.ReactNode;
  displayName: string;
  locale: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const { unreadCount, latestOrder, dismissLatest, markAllRead } = useOrderRealtimeNotifications({
    soundEnabled,
  });

  // Clear unread count automatically when viewing the Orders queue
  useEffect(() => {
    if (pathname.includes('/admin/orders')) {
      markAllRead();
    }
  }, [pathname, markAllRead]);

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await signOutCurrentUser();
      router.replace(`/${locale}/login`);
      router.refresh();
    } catch {
      setSignOutError('Sign out could not be completed. Check the connection and try again.');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto grid min-h-dvh max-w-[1720px] lg:grid-cols-[248px_1fr]">
        <aside className="border-border border-b bg-sidebar p-5 lg:border-r lg:border-b-0 lg:p-6">
          <div className="flex items-start justify-between gap-4 lg:block">
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.24em]">
                Kisok / Admin
              </p>
              <p className="mt-2 font-black text-3xl tracking-[-0.08em]">KISOK.</p>
            </div>
            <StatusPill>Connected</StatusPill>
          </div>
          <nav className="mt-8 grid gap-1" aria-label="Administration sections">
            {navigation.map((item) => {
              const href = `/${locale}${item.href}`;
              const active = item.href === '/admin' ? pathname === href : pathname.startsWith(href);
              const isOrders = item.href === '/admin/orders';

              return (
                <Link
                  aria-current={active ? 'page' : undefined}
                  className={buttonVariants({
                    className: 'h-10 w-full justify-between rounded-none px-3 text-left',
                    variant: active ? 'secondary' : 'ghost',
                  })}
                  href={href}
                  key={item.href}
                >
                  <span>{item.label}</span>
                  {isOrders && unreadCount > 0 ? (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 font-mono text-[10px] font-bold text-white animate-pulse">
                      {unreadCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="flex items-center justify-between gap-4 border-border border-b px-5 py-4 sm:px-8">
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                Admin workspace
              </p>
              <p className="mt-1 font-medium text-sm">{displayName}</p>
            </div>
            <div className="flex items-center gap-3">
              <OrderNotificationCenter
                latestOrder={latestOrder}
                locale={locale}
                onDismiss={dismissLatest}
                onSoundChange={setSoundEnabled}
              />
              <Button disabled={isSigningOut} onClick={handleSignOut} size="sm" variant="outline">
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </div>
          </header>
          {signOutError ? (
            <p
              className="border-destructive border-l-2 bg-destructive/10 px-5 py-3 text-destructive text-sm sm:px-8"
              role="alert"
            >
              {signOutError}
            </p>
          ) : null}
          <div className="p-5 sm:p-8 lg:p-10">{children}</div>
        </div>
      </div>
    </main>
  );
}
