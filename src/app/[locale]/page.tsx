import { redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';

import { routing } from '@/i18n/routing';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    redirect('/en/login');
  }
  redirect(`/${locale}/admin`);
}
