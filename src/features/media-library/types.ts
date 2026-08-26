export interface LocalMediaAsset {
  label: string;
  role: 'Brand mark' | 'Flavor image' | 'Product cover';
}

export interface MediaLibraryDataContract {
  list(): readonly LocalMediaAsset[];
}
