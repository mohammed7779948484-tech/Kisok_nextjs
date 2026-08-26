export interface LocalProduct {
  category: string;
  name: string;
  status: 'In stock' | 'Low stock' | 'Review stock';
  stock: number;
}

export interface ProductCatalogDataContract {
  list(): readonly LocalProduct[];
}
