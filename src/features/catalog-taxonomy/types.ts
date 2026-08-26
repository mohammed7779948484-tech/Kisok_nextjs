export interface BrandRecord {
  id: string;
  name: string;
  isActive: boolean;
  displayOrder: number;
  imageMediaAssetId: string | null;
}

export interface BrandInput {
  name: string;
}

export interface BrandUpdate {
  name?: string;
  isActive?: boolean;
}

export interface CatalogTaxonomyDataContract {
  listBrands(search?: string): Promise<BrandRecord[]>;
  createBrand(input: BrandInput): Promise<BrandRecord>;
  updateBrand(id: string, input: BrandUpdate): Promise<BrandRecord>;
}
