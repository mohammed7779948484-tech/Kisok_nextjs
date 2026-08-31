'use client';

import { useEffect, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import {
  BoxesIcon,
  GalleryVerticalEndIcon,
  GaugeIcon,
  ImagesIcon,
  Layers3Icon,
  PackageSearchIcon,
  Settings2Icon,
  ShapesIcon,
  ShoppingBagIcon,
  UsersIcon,
} from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { OrderNotificationCenter, useOrderRealtimeNotifications } from '@/features/orders';
import { signOutCurrentUser } from '@/infrastructure/supabase/auth/browser';
import { GuardedLink } from '@/shared/navigation/UnsavedChangesGuard';
import { OfflineBanner, StatusPill } from '@/shared/ui';

const navigation = [
  { href: '/admin', icon: GaugeIcon, label: 'Overview' },
  { href: '/admin/products', icon: PackageSearchIcon, label: 'Products' },
  { href: '/admin/catalog/brands', icon: ShapesIcon, label: 'Brands' },
  { href: '/admin/catalog/categories', icon: Layers3Icon, label: 'Categories' },
  { href: '/admin/catalog/options', icon: BoxesIcon, label: 'Option library' },
  { href: '/admin/inventory', icon: GalleryVerticalEndIcon, label: 'Inventory' },
  { href: '/admin/orders', icon: ShoppingBagIcon, label: 'Orders' },
  { href: '/admin/media', icon: ImagesIcon, label: 'Media' },
  { href: '/admin/users', icon: UsersIcon, label: 'Users' },
  { href: '/admin/settings', icon: Settings2Icon, label: 'Settings' },
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

  const cleanDisplayName =
    !displayName || /^local\s+admin$/i.test(displayName.trim())
      ? 'Admin'
      : displayName.replace(/local\s+admin/gi, 'Admin');

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto grid min-h-dvh max-w-[1800px] lg:grid-cols-[264px_1fr]">
        <aside className="border-border border-b bg-sidebar/95 p-4 backdrop-blur-xl lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-r lg:border-b-0 lg:p-6">
          <div className="flex items-start justify-between gap-4 lg:block">
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.24em]">
                Kisok / Admin
              </p>
              <p className="mt-2 font-black text-3xl tracking-[-0.06em]">
                KISOK<span className="text-primary">.</span>
              </p>
            </div>
            <StatusPill tone="success">Live</StatusPill>
          </div>
          <nav
            className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:grid lg:gap-1 lg:overflow-visible lg:pb-0"
            aria-label="Administration sections"
          >
            {navigation.map((item) => {
              const href = `/${locale}${item.href}`;
              const active = item.href === '/admin' ? pathname === href : pathname.startsWith(href);
              const isOrders = item.href === '/admin/orders';

              return (
                <GuardedLink
                  aria-current={active ? 'page' : undefined}
                  className={buttonVariants({
                    className:
                      'h-10 min-w-fit justify-between gap-2 rounded-lg px-3 text-left shadow-none lg:w-full',
                    variant: active ? 'secondary' : 'ghost',
                  })}
                  href={href}
                  key={item.href}
                >
                  <span className="flex items-center gap-2.5">
                    <item.icon aria-hidden="true" className="size-4" />
                    <span>{item.label}</span>
                  </span>
                  {isOrders && unreadCount > 0 ? (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success font-mono text-[10px] font-bold text-background motion-safe:animate-pulse">
                      {unreadCount}
                    </span>
                  ) : null}
                </GuardedLink>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">
          <OfflineBanner />
          <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-border border-b bg-background/85 px-5 py-3 backdrop-blur-xl sm:px-8">
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                Admin workspace
              </p>
              <p className="mt-1 font-medium text-sm">{cleanDisplayName}</p>
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
          <div className="p-4 sm:p-7 lg:p-10">{children}</div>
        </div>
      </div>
    </main>
  );
}
