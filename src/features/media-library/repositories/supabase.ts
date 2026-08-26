import type { SupabaseClient } from '@supabase/supabase-js';

import { getBrowserSupabaseClient } from '@/infrastructure/supabase/client/browser-client';
import type { Database } from '@/infrastructure/supabase/database.types';

import type { MediaAssetRecord, MediaLibraryDataContract } from '../types';

const ORDER_METHOD = 'order' as const;

function getClientOrThrow(): SupabaseClient<Database> {
  const client = getBrowserSupabaseClient();
  if (!client) throw new Error('Supabase is not configured for Media Library.');
  return client;
}

function mapMediaAsset(row: Database['public']['Tables']['media_assets']['Row']): MediaAssetRecord {
  return {
    id: row.id,
    publicId: row.public_id,
    secureUrl: row.secure_url,
    format: row.format,
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    createdAt: row.created_at,
  };
}

export function createMediaLibraryRepository(
  client: SupabaseClient<Database>,
): MediaLibraryDataContract {
  return {
    async listAssets() {
      const result = await client
        .from('media_assets')
        .select(
          'id,public_id,secure_url,format,width,height,bytes,created_at,updated_at,asset_id,created_by',
        )
        [ORDER_METHOD]('created_at', { ascending: false });
      if (result.error) throw result.error;
      return (result.data ?? []).map(mapMediaAsset);
    },
  };
}

export const mediaLibraryRepository: MediaLibraryDataContract = {
  listAssets() {
    return createMediaLibraryRepository(getClientOrThrow()).listAssets();
  },
};
