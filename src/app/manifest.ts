import type { MetadataRoute } from 'next';

import { routing } from '@/i18n/routing';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/admin',
    name: 'KISOK Admin',
    short_name: 'KISOK',
    description: 'KISOK store administration and order queue.',
    start_url: `/${routing.defaultLocale}/admin`,
    scope: '/',
    display: 'standalone',
    background_color: '#f6f7fa',
    theme_color: '#3159c9',
    icons: [
      { src: '/pwa-icons/192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icons/512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icons/maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
