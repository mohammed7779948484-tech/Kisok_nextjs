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
      existsSync(
        resolve(projectRoot, 'src/features/auth-admin-access/components/LocalAccessGate.tsx'),
      ),
    ).toBe(false);
    const hostedBoundaries = [
      'src/features/admin-users/repositories/supabase.ts',
      'src/infrastructure/supabase/auth/server.ts',
      'src/features/catalog-taxonomy/repositories/supabase.ts',
      'src/infrastructure/supabase/dashboard-operations/adapter.ts',
      'src/infrastructure/supabase/inventory/adapter.ts',
      'src/features/media-library/repositories/supabase.ts',
      'src/features/orders/repositories/supabase.ts',
      'src/features/product-catalog/repositories/supabase.ts',
      'src/features/store-settings/repositories/supabase.ts',
    ];

    for (const boundary of hostedBoundaries) {
      expect(existsSync(resolve(projectRoot, boundary))).toBe(true);
    }

    for (const placeholder of [
      'src/infrastructure/supabase/admin-users/adapter.ts',
      'src/infrastructure/supabase/auth-admin-access/adapter.ts',
      'src/infrastructure/supabase/catalog-taxonomy/adapter.ts',
      'src/infrastructure/supabase/media-library/adapter.ts',
      'src/infrastructure/supabase/orders/adapter.ts',
      'src/infrastructure/supabase/product-catalog/adapter.ts',
      'src/infrastructure/supabase/store-settings/adapter.ts',
    ]) {
      expect(existsSync(resolve(projectRoot, placeholder))).toBe(false);
    }

    const componentFiles = [
      'src/features/admin-users/components/AdminUsersPanel.tsx',
      'src/features/auth-admin-access/components/AdminLoginForm.tsx',
      'src/features/catalog-taxonomy/components/CatalogTaxonomyPanel.tsx',
      'src/features/catalog-taxonomy/components/BrandsPanel.tsx',
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
