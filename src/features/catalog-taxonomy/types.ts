export interface BrandRecord {
  id: string;
  name: string;
  isActive: boolean;
  displayOrder: number;
  imageMediaAssetId: string | null;
  imageUrl?: string | null;
  imagePublicId?: string | null;
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

export interface OptionTypeInput {
  name: string;
}

export interface OptionTypeUpdate {
  name?: string;
  isActive?: boolean;
}

export interface OptionValueInput {
  optionTypeId: string;
  value: string;
}

export interface OptionValueUpdate {
  value?: string;
  isActive?: boolean;
}

export interface CategoryRecord {
  id: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  displayOrder: number;
  imageMediaAssetId: string | null;
  imageUrl?: string | null;
  imagePublicId?: string | null;
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

export interface CatalogTaxonomyDataContract {
  /**
   * Brand create/update now go through Refine's `useCreate`/`useUpdate`
   * directly against the `brands` resource (see `BrandsPanel` and
   * `hooks/useBrandForm.ts`) — this repository keeps only the read path,
   * still used by the Product editor's Brand selector.
   */
  listBrands(search?: string): Promise<BrandRecord[]>;
  listCategories(): Promise<CategoryRecord[]>;
  createCategory(input: CategoryInput): Promise<CategoryRecord>;
  updateCategory(id: string, input: CategoryUpdate): Promise<CategoryRecord>;
  reorderCategories(scopeId: string | null, orderedIds: string[]): Promise<void>;
  listOptionTypes(): Promise<OptionTypeRecord[]>;
  createOptionType(input: OptionTypeInput): Promise<OptionTypeRecord>;
  updateOptionType(id: string, input: OptionTypeUpdate): Promise<OptionTypeRecord>;
  reorderOptionTypes(orderedIds: string[]): Promise<void>;
  createOptionValue(input: OptionValueInput): Promise<OptionValueRecord>;
  updateOptionValue(id: string, input: OptionValueUpdate): Promise<OptionValueRecord>;
  reorderOptionValues(scopeId: string, orderedIds: string[]): Promise<void>;
}
