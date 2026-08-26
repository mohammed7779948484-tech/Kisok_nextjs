import type { CatalogTaxonomyDataContract, LocalTaxonomyNode } from '../types';

export const localTaxonomyNodes: readonly LocalTaxonomyNode[] = [
  { children: 2, name: 'Arabica House', type: 'Brand', visibility: 'Active' },
  { children: 3, name: 'Coffee', type: 'Root category', visibility: 'Active' },
  { children: 0, name: 'Ground coffee', type: 'Child category', visibility: 'Active' },
];

export const localCatalogTaxonomyContract: CatalogTaxonomyDataContract = {
  list: () => localTaxonomyNodes,
};
