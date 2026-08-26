export interface MediaAssetRecord {
  id: string;
  publicId: string;
  secureUrl: string;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  createdAt: string;
  updatedAt: string;
  assetId: string | null;
  createdBy: string | null;
}

export interface MediaLibraryDataContract {
  listAssets(): Promise<MediaAssetRecord[]>;
}
