import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  getTrustedAdminSession: vi.fn(),
  selectResult: null as unknown,
  rpcResult: null as unknown,
  insertCalls: [] as unknown[],
  deleteCalls: [] as unknown[],
}));

vi.mock('@/infrastructure/supabase/auth/server', () => ({
  getTrustedAdminSession: testContext.getTrustedAdminSession,
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.test',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    CLOUDINARY_CLOUD_NAME: undefined,
    CLOUDINARY_API_KEY: undefined,
    CLOUDINARY_API_SECRET: undefined,
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from(table: string) {
      if (table !== 'media_assets') throw new Error(`unexpected table ${table}`);
      return {
        select() {
          return {
            eq() {
              return { maybeSingle: async () => testContext.selectResult };
            },
          };
        },
        delete() {
          return {
            eq: async (_column: string, id: string) => {
              testContext.deleteCalls.push(id);
              return { error: null };
            },
          };
        },
        insert: async (payload: unknown) => {
          testContext.insertCalls.push(payload);
          return { error: null };
        },
      };
    },
    rpc: async () => testContext.rpcResult,
  }),
}));

import { deleteMediaAsset } from './actions';

describe('Media Library delete-restore metadata integrity', () => {
  it('restores every original field, including asset_id and created_by, when Cloudinary deletion fails', async () => {
    testContext.getTrustedAdminSession.mockResolvedValue({ userId: 'admin-1' });
    testContext.selectResult = {
      data: {
        id: 'media-1',
        public_id: 'kisok/test/asset',
        secure_url: 'https://res.cloudinary.com/example/image/upload/test',
        format: 'webp',
        width: 640,
        height: 480,
        bytes: 1234,
        created_at: '2026-08-26T00:00:00Z',
        // Deliberately distinct from created_at, so the assertion below
        // proves the restore preserves the ORIGINAL updated_at rather than
        // a fresh now() value from the identity column default.
        updated_at: '2026-08-26T05:30:00Z',
        asset_id: 'cloudinary-asset-id-123',
        created_by: 'profile-original-owner',
      },
      error: null,
    };
    testContext.rpcResult = {
      data: {
        brands: 0,
        categories: 0,
        product_covers: 0,
        variant_media: 0,
        order_items_historical: 0,
      },
      error: null,
    };

    await expect(deleteMediaAsset('media-1')).rejects.toThrow(
      'Cloudinary server configuration is unavailable.',
    );

    expect(testContext.deleteCalls).toEqual(['media-1']);
    expect(testContext.insertCalls).toHaveLength(1);
    expect(testContext.insertCalls[0]).toMatchObject({
      id: 'media-1',
      public_id: 'kisok/test/asset',
      asset_id: 'cloudinary-asset-id-123',
      created_by: 'profile-original-owner',
      updated_at: '2026-08-26T05:30:00Z',
    });
  });
});
