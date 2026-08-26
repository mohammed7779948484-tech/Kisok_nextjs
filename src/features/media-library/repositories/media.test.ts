import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => ({
  client: {
    from(table: string) {
      if (table !== 'media_assets') throw new Error(`unexpected table ${table}`);
      return {
        select(_columns: string) {
          return {
            order(_column: string, _options: { ascending: boolean }) {
              return Promise.resolve({
                data: [
                  {
                    id: 'media-1',
                    public_id: 'kisok/test/asset',
                    secure_url: 'https://res.cloudinary.com/example/image/upload/test',
                    format: 'webp',
                    width: 640,
                    height: 480,
                    bytes: 1234,
                    created_at: '2026-08-26T00:00:00Z',
                    updated_at: '2026-08-26T00:00:00Z',
                    asset_id: 'kisok-cloudinary-asset-1',
                    created_by: 'profile-1',
                  },
                ],
                error: null,
              });
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

describe('Media Library Supabase repository', () => {
  it('lists hosted Media Asset metadata without local role fixtures', async () => {
    await expect(mediaLibraryRepository.listAssets()).resolves.toEqual([
      {
        id: 'media-1',
        publicId: 'kisok/test/asset',
        secureUrl: 'https://res.cloudinary.com/example/image/upload/test',
        format: 'webp',
        width: 640,
        height: 480,
        bytes: 1234,
        createdAt: '2026-08-26T00:00:00Z',
        assetId: 'kisok-cloudinary-asset-1',
        createdBy: 'profile-1',
      },
    ]);
  });
});
