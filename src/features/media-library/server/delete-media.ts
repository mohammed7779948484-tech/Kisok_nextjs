import type { MediaAssetRecord } from '../types';

export type MediaAssetUsage = Record<string, number>;

type MediaDeleteDependencies = {
  getAsset: (id: string) => Promise<MediaAssetRecord | null>;
  getUsage: (id: string) => Promise<MediaAssetUsage>;
  deleteMetadata: (asset: MediaAssetRecord) => Promise<void>;
  restoreMetadata: (asset: MediaAssetRecord) => Promise<void>;
  deleteCloudinary: (asset: MediaAssetRecord) => Promise<void>;
};

export async function executeMediaAssetDelete(
  id: string,
  dependencies: MediaDeleteDependencies,
): Promise<void> {
  const asset = await dependencies.getAsset(id);
  if (!asset) throw new Error('Media Asset does not exist.');

  const usage = await dependencies.getUsage(id);
  if (Object.values(usage).some((count) => count > 0)) {
    throw new Error('Media Asset is still in use.');
  }

  await dependencies.deleteMetadata(asset);
  try {
    await dependencies.deleteCloudinary(asset);
  } catch (error) {
    await dependencies.restoreMetadata(asset);
    throw error;
  }
}
