import type { LocalStoreSettings, StoreSettingsDataContract } from '../types';

export const localStoreSettings: Readonly<LocalStoreSettings> = {
  lowStockThreshold: '05 units',
  orderReset: 'Automatic after completion',
  storeIdentity: 'Kisok Central',
  timezone: 'Asia/Dubai',
};

export const localStoreSettingsContract: StoreSettingsDataContract = {
  get: () => localStoreSettings,
};
