export type ProductStockStatus = 'In stock' | 'Low stock' | 'Review stock' | 'Out of stock';

export interface ProductInput {
  name: string;
  brandId?: string | null;
  shortDescription?: string | null;
  isFeatured?: boolean;
  categoryIds?: string[];
}

export interface VariantInput {
  productId: string;
  barcode?: string | null;
  titleOverride?: string | null;
  lowStockThreshold?: number | null;
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
  brandName: string | null;
  variantCount: number;
  availableStock: number;
  status: ProductStockStatus;
  isActive: boolean;
  isFeatured: boolean;
}

export interface ProductCatalogDataContract {
  listProducts(): Promise<ProductRecord[]>;
  createProduct(input: ProductInput): Promise<{
    id: string;
    name: string;
    brandId: string | null;
    shortDescription: string | null;
    isActive: boolean;
    isFeatured: boolean;
    coverMediaAssetId: string | null;
  }>;
  createVariant(input: VariantInput): Promise<VariantRecord>;
}
