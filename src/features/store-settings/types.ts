import type { ValueDataContract } from '@/shared/contracts';

export interface LocalStoreSettings {
  lowStockThreshold: string;
  orderReset: string;
  storeIdentity: string;
  timezone: string;
}

export interface StoreSettingsDataContract extends ValueDataContract<LocalStoreSettings> {}
