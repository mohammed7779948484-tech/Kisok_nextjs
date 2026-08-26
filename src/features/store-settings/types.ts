export interface LocalStoreSettings {
  lowStockThreshold: string;
  orderReset: string;
  storeIdentity: string;
  timezone: string;
}

export interface StoreSettingsDataContract {
  get(): Readonly<LocalStoreSettings>;
}
