import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

import { Livvic } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getMessages, getTimeZone } from 'next-intl/server';

import { PwaRuntime } from '@/features/admin-pwa/components/PwaRuntime';
import { routing } from '@/i18n/routing';
import { getLocaleDirection } from '@/lib/config/app-locales';
import { APP_NAME, APP_URL } from '@/lib/config/seo';
// Regression sentinel — see file comment for what this guards.
import { HttpClientBundleSentinel } from '@/lib/utils/http/__bundle-sentinel__/client-bundle-sentinel';
import { RootProvider } from '@/providers';

const livvic = Livvic({
  subsets: ['latin'],
  variable: '--font-livvic',
  weight: ['100', '200', '300', '400', '500', '600', '700', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: 'KISOK store administration and order queue.',
  applicationName: APP_NAME,
  manifest: '/manifest.webmanifest',
  icons: { icon: '/pwa-icons/192.png', apple: '/pwa-icons/180.png' },
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: 'default' },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
    'max-video-preview': -1,
    'max-image-preview': 'large',
    'max-snippet': -1,
  },
};

export const viewport: Viewport = { themeColor: '#3159c9' };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Hydrates the entire message catalog — the intended next-intl default and
  // fine for a starter. Apps with large catalogs should scope messages per route
  // segment (multiple NextIntlClientProvider boundaries) to trim the payload.
  const [messages, timeZone] = await Promise.all([
    getMessages({ locale }),
    getTimeZone({ locale }),
  ]);

  return (
    <html lang={locale} dir={getLocaleDirection(locale)} suppressHydrationWarning={true}>
      <body className={`${livvic.variable} antialiased`}>
        <RootProvider locale={locale} messages={messages} timeZone={timeZone}>
          <HttpClientBundleSentinel />
          <PwaRuntime />
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
