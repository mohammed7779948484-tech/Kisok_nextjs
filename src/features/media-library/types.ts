export interface MediaAssetRecord {
  id: string;
  publicId: string;
  secureUrl: string;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  createdAt: string;
}

export interface MediaLibraryDataContract {
  listAssets(): Promise<MediaAssetRecord[]>;
}
