import { describe, expect, it } from 'vitest';

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const productRouteFiles = [
  'src/app/[locale]/admin/products/page.tsx',
  'src/app/[locale]/admin/products/create/page.tsx',
  'src/app/[locale]/admin/products/[id]/page.tsx',
  'src/app/[locale]/admin/products/[id]/edit/page.tsx',
];

describe('Product App Router workflow', () => {
  it('provides distinct list, create, show, and edit page entry points', () => {
    expect(productRouteFiles.map((file) => existsSync(resolve(process.cwd(), file)))).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });
});
