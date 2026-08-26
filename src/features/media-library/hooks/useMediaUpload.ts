'use client';

import { useCallback, useState } from 'react';

import { executeMediaUpload, uploadFileToCloudinary } from '../client/upload-media';
import { mediaLibraryRepository } from '../repositories';
import { getMediaUploadSignature } from '../server/actions';
import type { MediaAssetRecord } from '../types';

/**
 * Drives one Cloudinary upload from the browser: sign (server action) →
 * POST direct to Cloudinary → register the returned metadata via the
 * authenticated Supabase browser client. Returns `null` (never throws) on
 * failure so callers can branch on the result instead of catching.
 */
export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File): Promise<MediaAssetRecord | null> => {
    setUploading(true);
    setError(null);
    try {
      return await executeMediaUpload(file, {
        requestSignature: getMediaUploadSignature,
        uploadToCloudinary: (uploadedFile, signature) =>
          uploadFileToCloudinary(uploadedFile, signature),
        registerMediaAsset: (result) => mediaLibraryRepository.registerAsset(result),
      });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'The Media Asset could not be uploaded.',
      );
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, error };
}
