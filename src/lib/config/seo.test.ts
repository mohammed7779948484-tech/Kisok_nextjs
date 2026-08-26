import { describe, expect, it } from 'vitest';

import { generateSEOMetadata } from './seo';

describe('SEO locale URLs', () => {
  it('prefixes the default locale in the canonical URL', () => {
    const metadata = generateSEOMetadata({
      title: 'Admin',
      description: 'Admin workspace',
      path: '/admin',
      locale: 'en',
    });

    expect(metadata.alternates?.canonical).toMatch(/\/en\/admin$/);
  });
});
