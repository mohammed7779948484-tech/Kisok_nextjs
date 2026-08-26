import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { KisokAdminConsole } from '@/features/dashboard-operations/components/KisokAdminConsole';
import { routing } from '@/i18n/routing';
import { generateSEOMetadata } from '@/lib/config/seo';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: 'App' });

  return generateSEOMetadata({
    title: t('title'),
    description: t('description'),
    path: '/',
    locale,
  });
}

export default async function Home(props: Props) {
  const { locale } = await props.params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  await getTranslations('App');

  return <KisokAdminConsole />;
}
