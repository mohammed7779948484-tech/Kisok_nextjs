import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { AdminLoginForm } from '@/features/auth-admin-access/components/AdminLoginForm';
import { routing } from '@/i18n/routing';
import { getTrustedAdminSession } from '@/infrastructure/supabase/auth/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin sign in',
  description: 'Sign in to the KISOK Admin workspace.',
};

export default async function LoginPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const query = await searchParams;
  const nextValue = Array.isArray(query.next) ? query.next[0] : query.next;
  const nextPath = nextValue?.startsWith(`/${locale}/`) ? nextValue : `/${locale}/admin`;

  const session = await getTrustedAdminSession();
  if (session) {
    const adminNextPath = nextValue?.startsWith(`/${locale}/admin`)
      ? nextValue
      : `/${locale}/admin`;
    redirect(adminNextPath);
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-10 text-foreground">
      <section className="w-full max-w-md border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.24em]">
          Kisok / Admin
        </p>
        <h1 className="mt-5 font-black text-4xl tracking-[-0.08em]">Sign in</h1>
        <p className="mt-3 text-muted-foreground text-sm leading-6">
          Use an active Admin account to access catalog, inventory, orders, media, and settings.
        </p>
        <div className="mt-8">
          <AdminLoginForm nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
