import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { AdminShell } from '@/features/dashboard-operations/components/AdminShell';
import { getTrustedAdminSession } from '@/infrastructure/supabase/auth/server';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const session = await getTrustedAdminSession();

  if (!session) {
    const requestHeaders = await headers();
    const requestedPath = requestHeaders.get('x-pathname') ?? `/${locale}/admin`;
    redirect(`/${locale}/login?next=${requestedPath}`);
  }

  return (
    <AdminShell displayName={session.profile.display_name} locale={locale}>
      {children}
    </AdminShell>
  );
}
