export interface StoreSettingsRecord {
  id: boolean;
  storeName: string;
  globalLowStockThreshold: number;
  customerSuccessResetSeconds: number;
  storeTimezone: string;
  logoMediaAssetId: string | null;
}

export interface StoreSettingsUpdate {
  storeName?: string;
  globalLowStockThreshold?: number;
  customerSuccessResetSeconds?: number;
  storeTimezone?: string;
  logoMediaAssetId?: string | null;
}

export interface StoreSettingsDataContract {
  get(): Promise<StoreSettingsRecord>;
  update(input: StoreSettingsUpdate): Promise<StoreSettingsRecord>;
}
