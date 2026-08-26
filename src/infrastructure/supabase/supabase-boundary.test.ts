import { describe, expect, it } from 'vitest';

import { getSupabaseConfig } from './client/supabase-config';

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Supabase integration boundaries', () => {
  it('treats missing local configuration as an explicit unconfigured state', () => {
    expect(getSupabaseConfig(undefined, undefined)).toBeNull();
  });

  it('keeps a distributed adapter boundary and presentation components free of data clients', () => {
    const projectRoot = resolve(import.meta.dirname, '../../..');
    expect(
      existsSync(resolve(projectRoot, 'src/infrastructure/supabase/auth-admin-access/adapter.ts')),
    ).toBe(true);
    expect(
      existsSync(
        resolve(projectRoot, 'src/features/auth-admin-access/components/LocalAccessGate.tsx'),
      ),
    ).toBe(false);
    const adapterFeatures = [
      'admin-users',
      'auth-admin-access',
      'catalog-taxonomy',
      'dashboard-operations',
      'inventory',
      'media-library',
      'orders',
      'product-catalog',
      'store-settings',
    ];

    for (const feature of adapterFeatures) {
      expect(
        existsSync(resolve(projectRoot, `src/infrastructure/supabase/${feature}/adapter.ts`)),
      ).toBe(true);
    }

    const componentFiles = [
      'src/features/admin-users/components/AdminUsersPanel.tsx',
      'src/features/auth-admin-access/components/AdminLoginForm.tsx',
      'src/features/catalog-taxonomy/components/CatalogTaxonomyPanel.tsx',
      'src/features/dashboard-operations/components/AdminShell.tsx',
      'src/features/dashboard-operations/components/OperationalDashboard.tsx',
      'src/features/inventory/components/InventoryPanel.tsx',
      'src/features/media-library/components/MediaLibraryPanel.tsx',
      'src/features/orders/components/OrdersPanel.tsx',
      'src/features/product-catalog/components/ProductCatalogPanel.tsx',
      'src/features/store-settings/components/StoreSettingsPanel.tsx',
    ];

    for (const file of componentFiles) {
      const source = readFileSync(resolve(projectRoot, file), 'utf8');
      expect(source).not.toMatch(/\.\.\/data\//);
      expect(source).not.toMatch(/@supabase|supabase-js/);
    }
  });
});
