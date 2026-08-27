import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

import { createMediaLibraryRepository } from './supabase';

describe('Media Library pagination repository', () => {
  it('uses a bounded server range and public-id search for a shared Media picker page', async () => {
    const ilike = vi.fn();
    const range = vi.fn().mockResolvedValue({ count: 41, data: [], error: null });
    const order = vi.fn(() => ({ range }));
    const client = {
      from(table: string) {
        if (table !== 'media_assets') throw new Error(`unexpected table ${table}`);
        return {
          select: vi.fn(() => ({
            ilike: ilike.mockReturnValue({ order }),
            order,
          })),
        };
      },
    } as unknown as SupabaseClient<Database>;
    const repository = createMediaLibraryRepository(client) as unknown as {
      listAssetsPage: (input: { page: number; pageSize: number; search: string }) => Promise<{
        assets: unknown[];
        total: number;
      }>;
    };

    await expect(
      repository.listAssetsPage({ page: 2, pageSize: 20, search: 'berry' }),
    ).resolves.toEqual({
      assets: [],
      total: 41,
    });

    expect(ilike).toHaveBeenCalledWith('public_id', '%berry%');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(range).toHaveBeenCalledWith(20, 39);
  });
});
