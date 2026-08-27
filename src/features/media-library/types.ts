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

export interface MediaAssetPage {
  assets: MediaAssetRecord[];
  total: number;
}

export interface MediaAssetPageInput {
  page: number;
  pageSize: number;
  search?: string;
}

export interface MediaAssetInsertInput {
  publicId: string;
  secureUrl: string;
  assetId: string | null;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
}

export interface VariantMediaAssetSummary {
  publicId: string;
  secureUrl: string;
  width: number | null;
  height: number | null;
  format: string | null;
}

export interface VariantMediaRecord {
  variantId: string;
  mediaAssetId: string;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: string;
  asset: VariantMediaAssetSummary;
}

export interface MediaLibraryDataContract {
  getAsset(id: string): Promise<MediaAssetRecord | null>;
  listAssets(): Promise<MediaAssetRecord[]>;
  listAssetsPage(input: MediaAssetPageInput): Promise<MediaAssetPage>;
  registerAsset(input: MediaAssetInsertInput): Promise<MediaAssetRecord>;
  listVariantMedia(variantId: string): Promise<VariantMediaRecord[]>;
  attachVariantMedia(variantId: string, mediaAssetId: string): Promise<void>;
  /**
   * Deletes only the `product_variant_media` join row for this Variant and
   * Media Asset. The underlying `media_assets` row (and its Cloudinary
   * asset) is untouched — deleting that is a separate, usage-guarded
   * operation exposed only through `deleteMediaAsset` in `server/actions.ts`.
   * Never call that from a "Remove from Variant" action, and never call this
   * expecting it to free up Cloudinary storage.
   */
  detachVariantMedia(variantId: string, mediaAssetId: string): Promise<void>;
  setPrimaryVariantMedia(variantId: string, mediaAssetId: string): Promise<void>;
  reorderVariantMedia(variantId: string, orderedMediaAssetIds: string[]): Promise<void>;
}
