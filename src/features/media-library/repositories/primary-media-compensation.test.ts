import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const updatePayloads: unknown[] = [];
  let updateCount = 0;
  const client = {
    from(table: string) {
      if (table !== 'product_variant_media') throw new Error(`unexpected table ${table}`);
      return {
        select() {
          return {
            eq() {
              return {
                eq() {
                  return {
                    maybeSingle: () =>
                      Promise.resolve({ data: { media_asset_id: 'media-old' }, error: null }),
                  };
                },
              };
            },
          };
        },
        update(payload: unknown) {
          updatePayloads.push(payload);
          updateCount += 1;
          return {
            eq() {
              return {
                eq() {
                  return Promise.resolve({
                    error:
                      updateCount === 2
                        ? { code: 'target_failed', message: 'new primary could not be set' }
                        : null,
                  });
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient<Database>;
  return { client, updatePayloads };
});

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => testContext.client,
}));

import { mediaLibraryRepository } from './index';

describe('primary Variant Media compensation', () => {
  it('restores the prior primary when selecting a new primary fails', async () => {
    await expect(
      mediaLibraryRepository.setPrimaryVariantMedia('variant-1', 'media-new'),
    ).rejects.toMatchObject({ message: 'new primary could not be set' });

    expect(testContext.updatePayloads).toEqual([
      { is_primary: false },
      { is_primary: true },
      { is_primary: true },
    ]);
  });
});
