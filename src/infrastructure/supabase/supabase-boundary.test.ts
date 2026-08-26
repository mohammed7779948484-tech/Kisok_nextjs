import { describe, expect, it } from 'vitest';

import { deferredBrowserSupabaseClient } from './client/browser-client';
import { deferredServerSupabaseClient } from './client/server-client';
import { dashboardOperationsSupabaseAdapter } from './dashboard-operations/adapter';

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('deferred Supabase boundaries', () => {
  it('exposes explicit non-connected browser, server, and dashboard boundaries', () => {
    expect(deferredBrowserSupabaseClient.connection).toBe('deferred');
    expect(deferredServerSupabaseClient.connection).toBe('deferred');
    expect(dashboardOperationsSupabaseAdapter.connection).toBe('deferred');
  });

  it('keeps a distributed adapter boundary and presentation components free of data clients', () => {
    const projectRoot = resolve(import.meta.dirname, '../../..');
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
      'src/features/auth-admin-access/components/LocalAccessGate.tsx',
      'src/features/catalog-taxonomy/components/CatalogTaxonomyPanel.tsx',
      'src/features/dashboard-operations/components/KisokAdminConsole.tsx',
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
