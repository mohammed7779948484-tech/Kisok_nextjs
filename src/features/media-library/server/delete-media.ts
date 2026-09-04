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
    try {
      await dependencies.restoreMetadata(asset);
    } catch (restoreError) {
      // The worst case: the Cloudinary asset survives (delete failed) but its
      // Supabase metadata row is now also gone (restore failed). Neither
      // failure may be silently dropped behind the other — this is a real
      // orphaned-asset state that needs manual reconciliation, and the
      // message must say so.
      const originalMessage = error instanceof Error ? error.message : String(error);
      const restoreMessage =
        restoreError instanceof Error ? restoreError.message : String(restoreError);
      throw new Error(
        `Media Asset deletion failed (${originalMessage}) and metadata restoration also failed ` +
          `(${restoreMessage}). The Cloudinary asset was not deleted, but its Supabase metadata ` +
          'row is missing — this requires manual reconciliation.',
      );
    }
    throw error;
  }
}
