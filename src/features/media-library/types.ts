import type { ListDataContract } from '@/shared/contracts';

export interface LocalMediaAsset {
  label: string;
  role: 'Brand mark' | 'Flavor image' | 'Product cover';
}

export interface MediaLibraryDataContract extends ListDataContract<LocalMediaAsset> {}
