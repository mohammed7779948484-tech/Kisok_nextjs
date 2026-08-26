import type { LocalProduct, ProductCatalogDataContract } from '../types';

export const localProducts: readonly LocalProduct[] = [
  { category: 'Coffee / Ground', name: 'Arabic Reserve', status: 'Low stock', stock: 3 },
  { category: 'Tea / Green', name: 'Ceremony Matcha', status: 'Review stock', stock: 7 },
  { category: 'Coffee / Pods', name: 'Midnight Roast', status: 'In stock', stock: 18 },
];

export const localProductCatalogContract: ProductCatalogDataContract = {
  list: () => localProducts,
};
