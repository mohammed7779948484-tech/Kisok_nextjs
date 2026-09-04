import type { SupabaseClient } from '@supabase/supabase-js';

import { getBrowserSupabaseClient } from '@/infrastructure/supabase/client/browser-client';
import type { Database } from '@/infrastructure/supabase/database.types';

import type { StoreSettingsDataContract, StoreSettingsRecord, StoreSettingsUpdate } from '../types';

function getClientOrThrow(): SupabaseClient<Database> {
  const client = getBrowserSupabaseClient();
  if (!client) throw new Error('Supabase is not configured for Store Settings.');
  return client;
}

function mapSettings(
  row: Database['public']['Tables']['store_settings']['Row'],
): StoreSettingsRecord {
  return {
    id: row.id,
    storeName: row.store_name,
    globalLowStockThreshold: row.global_low_stock_threshold,
    customerSuccessResetSeconds: row.customer_success_reset_seconds,
    storeTimezone: row.store_timezone,
    logoMediaAssetId: row.logo_media_asset_id,
  };
}

const columns =
  'id,store_name,global_low_stock_threshold,customer_success_reset_seconds,store_timezone,logo_media_asset_id,created_at,updated_at';

export function createStoreSettingsRepository(
  client: SupabaseClient<Database>,
): StoreSettingsDataContract {
  return {
    async get() {
      const result = await client.from('store_settings').select(columns).single();
      if (result.error) throw result.error;
      return mapSettings(result.data);
    },

    async update(input: StoreSettingsUpdate) {
      const payload: Database['public']['Tables']['store_settings']['Update'] = {};
      if (input.storeName !== undefined) payload.store_name = input.storeName.trim();
      if (input.globalLowStockThreshold !== undefined)
        payload.global_low_stock_threshold = input.globalLowStockThreshold;
      if (input.customerSuccessResetSeconds !== undefined)
        payload.customer_success_reset_seconds = input.customerSuccessResetSeconds;
      if (input.storeTimezone !== undefined) payload.store_timezone = input.storeTimezone;
      if (input.logoMediaAssetId !== undefined)
        payload.logo_media_asset_id = input.logoMediaAssetId;

      const result = await client
        .from('store_settings')
        .update(payload)
        .eq('id', true)
        .select(columns)
        .single();
      if (result.error) throw result.error;
      return mapSettings(result.data);
    },
  };
}

export const storeSettingsRepository: StoreSettingsDataContract = {
  get() {
    return createStoreSettingsRepository(getClientOrThrow()).get();
  },
  update(input) {
    return createStoreSettingsRepository(getClientOrThrow()).update(input);
  },
};
