import type { MediaAssetRecord } from '../types';

export type MediaUploadSignature = {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
};

export type CloudinaryUploadResult = {
  publicId: string;
  secureUrl: string;
  assetId: string | null;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
};

/**
 * The exact multipart body Cloudinary's signed upload API expects for the
 * parameters `getMediaUploadSignature` signs — `timestamp` only, plus the
 * unsigned `file`, `api_key`, and `signature` fields. Adding any other
 * signed parameter here without also signing it server-side would make
 * Cloudinary reject the upload with an "Invalid Signature" error.
 */
export function buildCloudinaryUploadFormData(
  file: File,
  signature: MediaUploadSignature,
): FormData {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signature.apiKey);
  formData.append('timestamp', String(signature.timestamp));
  formData.append('signature', signature.signature);
  return formData;
}

export async function uploadFileToCloudinary(
  file: File,
  signature: MediaUploadSignature,
  fetchImpl: typeof fetch = fetch,
): Promise<CloudinaryUploadResult> {
  const response = await fetchImpl(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
    { method: 'POST', body: buildCloudinaryUploadFormData(file, signature) },
  );
  const payload = (await response.json().catch(() => null)) as {
    public_id?: string;
    secure_url?: string;
    asset_id?: string;
    width?: number;
    height?: number;
    format?: string;
    bytes?: number;
    error?: { message?: string };
  } | null;

  if (!(response.ok && payload?.public_id && payload.secure_url)) {
    throw new Error(payload?.error?.message ?? 'Cloudinary upload failed.');
  }

  return {
    publicId: payload.public_id,
    secureUrl: payload.secure_url,
    assetId: payload.asset_id ?? null,
    width: payload.width ?? null,
    height: payload.height ?? null,
    format: payload.format ?? null,
    bytes: payload.bytes ?? null,
  };
}

export type MediaUploadDependencies = {
  requestSignature: () => Promise<MediaUploadSignature>;
  uploadToCloudinary: (
    file: File,
    signature: MediaUploadSignature,
  ) => Promise<CloudinaryUploadResult>;
  registerMediaAsset: (result: CloudinaryUploadResult) => Promise<MediaAssetRecord>;
  cleanupUploadedAsset: (result: CloudinaryUploadResult) => Promise<void>;
};

/**
 * Orchestrates one Media Asset upload: sign → upload to Cloudinary →
 * register the metadata row. Each stage only runs if the previous one
 * succeeded, so an unauthenticated caller never reaches Cloudinary, and a
 * failed Cloudinary upload never leaves an orphaned `media_assets` row.
 */
export async function executeMediaUpload(
  file: File,
  dependencies: MediaUploadDependencies,
): Promise<MediaAssetRecord> {
  const signature = await dependencies.requestSignature();
  const uploaded = await dependencies.uploadToCloudinary(file, signature);
  try {
    return await dependencies.registerMediaAsset(uploaded);
  } catch (registrationError) {
    try {
      await dependencies.cleanupUploadedAsset(uploaded);
    } catch (cleanupError) {
      const registrationMessage =
        registrationError instanceof Error ? registrationError.message : String(registrationError);
      const cleanupMessage =
        cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
      throw new Error(
        `Media metadata registration failed (${registrationMessage}) and Cloudinary cleanup also failed (${cleanupMessage}). Manual cleanup is required.`,
      );
    }
    throw registrationError;
  }
}
