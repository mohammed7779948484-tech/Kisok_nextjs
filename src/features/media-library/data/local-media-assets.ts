import type { LocalMediaAsset, MediaLibraryDataContract } from '../types';

export const localMediaAssets: readonly LocalMediaAsset[] = [
  { label: 'origin-dark.png', role: 'Brand mark' },
  { label: 'arabic-reserve.jpg', role: 'Product cover' },
  { label: 'matcha-detail.jpg', role: 'Flavor image' },
];

export const localMediaLibraryContract: MediaLibraryDataContract = {
  list: () => localMediaAssets,
};
