import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => ({
  insertCalls: [] as unknown[],
  client: {
    from(table: string) {
      if (table !== 'media_assets') throw new Error(`unexpected table ${table}`);
      return {
        insert(payload: unknown) {
          testContext.insertCalls.push(payload);
          return {
            select(_columns: string) {
              return {
                single: async () => ({
                  data: {
                    id: 'media-2',
                    public_id: 'kisok/new/asset',
                    secure_url: 'https://res.cloudinary.com/example/image/upload/new',
                    format: 'png',
                    width: 200,
                    height: 100,
                    bytes: 4321,
                    created_at: '2026-08-26T00:00:00Z',
                    updated_at: '2026-08-26T00:00:00Z',
                    asset_id: 'cloudinary-asset-new',
                    created_by: 'profile-1',
                  },
                  error: null,
                }),
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient<Database>,
}));

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => testContext.client,
}));

import { mediaLibraryRepository } from './index';

describe('Media Library Supabase repository — registerAsset', () => {
  it('inserts a newly uploaded asset via the authenticated browser client and returns the mapped record', async () => {
    await expect(
      mediaLibraryRepository.registerAsset({
        publicId: 'kisok/new/asset',
        secureUrl: 'https://res.cloudinary.com/example/image/upload/new',
        assetId: 'cloudinary-asset-new',
        width: 200,
        height: 100,
        format: 'png',
        bytes: 4321,
      }),
    ).resolves.toEqual({
      id: 'media-2',
      publicId: 'kisok/new/asset',
      secureUrl: 'https://res.cloudinary.com/example/image/upload/new',
      format: 'png',
      width: 200,
      height: 100,
      bytes: 4321,
      createdAt: '2026-08-26T00:00:00Z',
      updatedAt: '2026-08-26T00:00:00Z',
      assetId: 'cloudinary-asset-new',
      createdBy: 'profile-1',
    });

    expect(testContext.insertCalls).toEqual([
      {
        public_id: 'kisok/new/asset',
        secure_url: 'https://res.cloudinary.com/example/image/upload/new',
        asset_id: 'cloudinary-asset-new',
        width: 200,
        height: 100,
        format: 'png',
        bytes: 4321,
      },
    ]);
  });
});
