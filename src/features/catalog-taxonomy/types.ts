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

export interface OptionValueRecord {
  id: string;
  value: string;
  isActive: boolean;
  displayOrder: number;
}

export interface OptionTypeRecord {
  id: string;
  name: string;
  isActive: boolean;
  displayOrder: number;
  values: OptionValueRecord[];
}

export interface CategoryRecord {
  id: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  displayOrder: number;
  imageMediaAssetId: string | null;
}

export interface CategoryInput {
  name: string;
  parentId?: string | null;
  imageMediaAssetId?: string | null;
}

export interface CategoryUpdate {
  name?: string;
  parentId?: string | null;
  isActive?: boolean;
  imageMediaAssetId?: string | null;
}

export interface BrandUpdate {
  name?: string;
  isActive?: boolean;
}

export interface CatalogTaxonomyDataContract {
  listBrands(search?: string): Promise<BrandRecord[]>;
  createBrand(input: BrandInput): Promise<BrandRecord>;
  updateBrand(id: string, input: BrandUpdate): Promise<BrandRecord>;
  listCategories(): Promise<CategoryRecord[]>;
  createCategory(input: CategoryInput): Promise<CategoryRecord>;
  updateCategory(id: string, input: CategoryUpdate): Promise<CategoryRecord>;
  reorderCategories(scopeId: string | null, orderedIds: string[]): Promise<void>;
  listOptionTypes(): Promise<OptionTypeRecord[]>;
}
