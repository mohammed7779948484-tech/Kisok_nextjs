export type ProductStockStatus = 'In stock' | 'Low stock' | 'Review stock' | 'Out of stock';

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
}
