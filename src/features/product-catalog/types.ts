export type ProductStockStatus = 'In stock' | 'Low stock' | 'Review stock' | 'Out of stock';

export interface ProductInput {
  name: string;
  brandId?: string | null;
  shortDescription?: string | null;
  isFeatured?: boolean;
  categoryIds?: string[];
}

export interface ProductUpdate {
  name?: string;
  brandId?: string | null;
  shortDescription?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
  coverMediaAssetId?: string | null;
}

export interface ProductWriteResult {
  id: string;
  name: string;
  brandId: string | null;
  shortDescription: string | null;
  isActive: boolean;
  isFeatured: boolean;
  coverMediaAssetId: string | null;
}

export interface VariantInput {
  productId: string;
  barcode?: string | null;
  titleOverride?: string | null;
  lowStockThreshold?: number | null;
}

export interface VariantUpdate {
  barcode?: string | null;
  titleOverride?: string | null;
  lowStockThreshold?: number | null;
  isActive?: boolean;
}

export interface VariantOptionSelection {
  optionTypeId: string;
  optionValueId: string;
}

export interface VariantOptionValueRecord {
  optionTypeId: string;
  optionTypeName: string;
  optionValueId: string;
  optionValueName: string;
}

export interface VariantRecord {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  titleOverride: string | null;
  isActive: boolean;
  lowStockThreshold: number | null;
}

export interface ProductRecord {
  id: string;
  name: string;
  brandId: string | null;
  brandName: string | null;
  shortDescription: string | null;
  variantCount: number;
  availableStock: number;
  status: ProductStockStatus;
  isActive: boolean;
  isFeatured: boolean;
}

export interface ProductCatalogDataContract {
  listProducts(): Promise<ProductRecord[]>;
  createProduct(input: ProductInput): Promise<ProductWriteResult>;
  updateProduct(id: string, input: ProductUpdate): Promise<ProductWriteResult>;
  listProductCategoryIds(productId: string): Promise<string[]>;
  setProductCategories(productId: string, categoryIds: string[]): Promise<void>;
  createVariant(input: VariantInput): Promise<VariantRecord>;
  listVariants(productId: string): Promise<VariantRecord[]>;
  updateVariant(id: string, input: VariantUpdate): Promise<VariantRecord>;
  listVariantOptionValues(variantId: string): Promise<VariantOptionValueRecord[]>;
  replaceVariantOptionValues(
    variantId: string,
    selections: VariantOptionSelection[],
  ): Promise<void>;
}
