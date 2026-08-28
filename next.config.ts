import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { isProduction } from './src/lib/config/constants';

const isVercelBuild = process.env.VERCEL === '1';

const nextConfig: NextConfig = {
  // Next.js 16.3.x + Vercel's build adapter currently conflicts with
  // `output: 'standalone'` and can fail during onBuildComplete because
  // `.next/next-server.js.nft.json` is not emitted. Vercel does not need the
  // standalone artifact, so keep it only for non-Vercel production builds
  // (for example Docker/self-hosted deployments).
  output: isProduction && !isVercelBuild ? 'standalone' : undefined,
  reactCompiler: false,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
  },
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
