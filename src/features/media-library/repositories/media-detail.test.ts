import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

import { createMediaLibraryRepository } from './supabase';

describe('Media Library detail repository', () => {
  it('fetches one selected Media Asset by id for Product cover hydration', async () => {
    const eq = vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          asset_id: 'cloudinary-1',
          bytes: 1024,
          created_at: '2026-08-27T00:00:00Z',
          created_by: 'admin-1',
          format: 'webp',
          height: 640,
          id: 'media-1',
          public_id: 'products/citrus',
          secure_url: 'https://example.test/citrus.webp',
          updated_at: '2026-08-27T00:00:00Z',
          width: 640,
        },
        error: null,
      }),
    });
    const client = {
      from(table: string) {
        if (table !== 'media_assets') throw new Error(`unexpected table ${table}`);
        return { select: vi.fn(() => ({ eq })) };
      },
    } as unknown as SupabaseClient<Database>;
    const repository = createMediaLibraryRepository(client) as unknown as {
      getAsset: (id: string) => Promise<unknown>;
    };

    await expect(repository.getAsset('media-1')).resolves.toMatchObject({
      id: 'media-1',
      publicId: 'products/citrus',
    });
    expect(eq).toHaveBeenCalledWith('id', 'media-1');
  });
});
