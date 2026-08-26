export interface LocalTaxonomyNode {
  children: number;
  name: string;
  type: 'Brand' | 'Child category' | 'Root category';
  visibility: 'Active';
}

export interface CatalogTaxonomyDataContract {
  list(): readonly LocalTaxonomyNode[];
}
