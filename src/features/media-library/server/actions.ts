'use server';

import { getTrustedAdminSession } from '@/infrastructure/supabase/auth/server';
import { getServiceSupabaseClient } from '@/infrastructure/supabase/client/service-client';
import type { Database } from '@/infrastructure/supabase/database.types';
import { env } from '@/lib/env';

import type { MediaAssetRecord } from '../types';
import { type CloudinaryUploadParameters, createCloudinaryUploadSignature } from './cloudinary';
import { executeMediaAssetDelete } from './delete-media';

function mapAsset(row: Database['public']['Tables']['media_assets']['Row']): MediaAssetRecord {
  return {
    id: row.id,
    publicId: row.public_id,
    secureUrl: row.secure_url,
    format: row.format,
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    createdAt: row.created_at,
    assetId: row.asset_id,
    createdBy: row.created_by,
  };
}

function usageFromJson(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Media Asset usage returned an invalid response.');
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, count]) => {
      if (typeof count !== 'number')
        throw new Error('Media Asset usage returned an invalid count.');
      return [key, count];
    }),
  );
}

async function destroyCloudinaryAsset(asset: MediaAssetRecord): Promise<void> {
  if (!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET)) {
    throw new Error('Cloudinary server configuration is unavailable.');
  }
  const parameters: CloudinaryUploadParameters = {
    invalidate: true,
    public_id: asset.publicId,
    timestamp: Math.floor(Date.now() / 1000),
  };
  const form = new URLSearchParams({
    api_key: env.CLOUDINARY_API_KEY,
    invalidate: 'true',
    public_id: asset.publicId,
    signature: createCloudinaryUploadSignature(parameters, env.CLOUDINARY_API_SECRET),
    timestamp: String(parameters.timestamp),
  });
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
    { method: 'POST', body: form },
  );
  const payload = (await response.json().catch(() => null)) as {
    result?: string;
    error?: { message?: string };
  } | null;
  if (!response.ok || (payload?.result !== 'ok' && payload?.result !== 'not found')) {
    throw new Error(payload?.error?.message ?? 'Cloudinary Asset deletion failed.');
  }
}

export async function deleteMediaAsset(id: string): Promise<void> {
  if (!(await getTrustedAdminSession())) {
    throw new Error('An active Admin session is required.');
  }

  const client = getServiceSupabaseClient();
  await executeMediaAssetDelete(id, {
    getAsset: async (assetId) => {
      const result = await client
        .from('media_assets')
        .select(
          'id,public_id,secure_url,format,width,height,bytes,created_at,updated_at,asset_id,created_by',
        )
        .eq('id', assetId)
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data ? mapAsset(result.data) : null;
    },
    getUsage: async (assetId) => {
      const result = await client.rpc('get_media_asset_usage', { target_media_asset_id: assetId });
      if (result.error) throw result.error;
      return usageFromJson(result.data);
    },
    deleteMetadata: async (asset) => {
      const result = await client.from('media_assets').delete().eq('id', asset.id);
      if (result.error) throw result.error;
    },
    restoreMetadata: async (asset) => {
      const result = await client.from('media_assets').insert({
        id: asset.id,
        public_id: asset.publicId,
        secure_url: asset.secureUrl,
        format: asset.format,
        width: asset.width,
        height: asset.height,
        bytes: asset.bytes,
        created_at: asset.createdAt,
        asset_id: asset.assetId,
        created_by: asset.createdBy,
      });
      if (result.error) throw result.error;
    },
    deleteCloudinary: destroyCloudinaryAsset,
  });
}
