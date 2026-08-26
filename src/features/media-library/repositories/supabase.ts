import type { SupabaseClient } from '@supabase/supabase-js';

import { getBrowserSupabaseClient } from '@/infrastructure/supabase/client/browser-client';
import type { Database } from '@/infrastructure/supabase/database.types';

import type {
  MediaAssetInsertInput,
  MediaAssetRecord,
  MediaLibraryDataContract,
  VariantMediaRecord,
} from '../types';

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
    updatedAt: row.updated_at,
    assetId: row.asset_id,
    createdBy: row.created_by,
  };
}

function mapVariantMedia(row: {
  variant_id: string;
  media_asset_id: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
  media_assets: {
    public_id: string;
    secure_url: string;
    width: number | null;
    height: number | null;
    format: string | null;
  } | null;
}): VariantMediaRecord {
  if (!row.media_assets) {
    throw new Error('Variant Media row is missing its Media Asset relation.');
  }
  return {
    variantId: row.variant_id,
    mediaAssetId: row.media_asset_id,
    displayOrder: row.display_order,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    asset: {
      publicId: row.media_assets.public_id,
      secureUrl: row.media_assets.secure_url,
      width: row.media_assets.width,
      height: row.media_assets.height,
      format: row.media_assets.format,
    },
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

    async registerAsset(input: MediaAssetInsertInput) {
      const result = await client
        .from('media_assets')
        .insert({
          public_id: input.publicId,
          secure_url: input.secureUrl,
          asset_id: input.assetId,
          width: input.width,
          height: input.height,
          format: input.format,
          bytes: input.bytes,
        })
        .select(
          'id,public_id,secure_url,format,width,height,bytes,created_at,updated_at,asset_id,created_by',
        )
        .single();
      if (result.error) throw result.error;
      return mapMediaAsset(result.data);
    },

    async listVariantMedia(variantId: string) {
      const result = await client
        .from('product_variant_media')
        .select(
          'variant_id,media_asset_id,display_order,is_primary,created_at,media_assets(public_id,secure_url,width,height,format)',
        )
        .eq('variant_id', variantId)
        [ORDER_METHOD]('display_order', { ascending: true });
      if (result.error) throw result.error;
      return (result.data ?? []).map(mapVariantMedia);
    },

    async attachVariantMedia(variantId: string, mediaAssetId: string) {
      const result = await client
        .from('product_variant_media')
        .insert({ variant_id: variantId, media_asset_id: mediaAssetId });
      if (result.error) throw result.error;
    },

    async detachVariantMedia(variantId: string, mediaAssetId: string) {
      // Deletes ONLY the `product_variant_media` join row. The underlying
      // `media_assets` row (and its Cloudinary asset) is a separate,
      // usage-guarded resource — see `deleteMediaAsset` in
      // `server/actions.ts` for the only supported way to delete it. Never
      // conflate "Remove from Variant" with "Delete Media Asset".
      const result = await client
        .from('product_variant_media')
        .delete()
        .eq('variant_id', variantId)
        .eq('media_asset_id', mediaAssetId);
      if (result.error) throw result.error;
    },

    async setPrimaryVariantMedia(variantId: string, mediaAssetId: string) {
      // `product_variant_media_one_primary_per_variant` is a partial unique
      // index on (variant_id) WHERE is_primary. Setting the new primary
      // before clearing the old one would momentarily leave two primary
      // rows for the same Variant and violate that index, so the previous
      // primary is always unset first, in its own statement, before the new
      // one is set.
      const unset = await client
        .from('product_variant_media')
        .update({ is_primary: false })
        .eq('variant_id', variantId)
        .eq('is_primary', true);
      if (unset.error) throw unset.error;

      const set = await client
        .from('product_variant_media')
        .update({ is_primary: true })
        .eq('variant_id', variantId)
        .eq('media_asset_id', mediaAssetId);
      if (set.error) throw set.error;
    },

    async reorderVariantMedia(variantId: string, orderedMediaAssetIds: string[]) {
      const result = await client.rpc('reorder_items', {
        resource_name: 'variant_media',
        scope_id: variantId,
        ordered_ids: orderedMediaAssetIds,
      });
      if (result.error) throw result.error;
    },
  };
}

export const mediaLibraryRepository: MediaLibraryDataContract = {
  listAssets() {
    return createMediaLibraryRepository(getClientOrThrow()).listAssets();
  },
  registerAsset(input) {
    return createMediaLibraryRepository(getClientOrThrow()).registerAsset(input);
  },
  listVariantMedia(variantId) {
    return createMediaLibraryRepository(getClientOrThrow()).listVariantMedia(variantId);
  },
  attachVariantMedia(variantId, mediaAssetId) {
    return createMediaLibraryRepository(getClientOrThrow()).attachVariantMedia(
      variantId,
      mediaAssetId,
    );
  },
  detachVariantMedia(variantId, mediaAssetId) {
    return createMediaLibraryRepository(getClientOrThrow()).detachVariantMedia(
      variantId,
      mediaAssetId,
    );
  },
  setPrimaryVariantMedia(variantId, mediaAssetId) {
    return createMediaLibraryRepository(getClientOrThrow()).setPrimaryVariantMedia(
      variantId,
      mediaAssetId,
    );
  },
  reorderVariantMedia(variantId, orderedMediaAssetIds) {
    return createMediaLibraryRepository(getClientOrThrow()).reorderVariantMedia(
      variantId,
      orderedMediaAssetIds,
    );
  },
};
