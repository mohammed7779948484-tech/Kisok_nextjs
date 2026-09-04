export const MAX_MEDIA_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_MEDIA_UPLOAD_DIMENSION = 5000;

const acceptedImageTypes = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

type ImageDimensions = { height: number; width: number };
type DimensionsReader = (file: File) => Promise<ImageDimensions>;

export type MediaUploadValidation =
  | { message?: undefined; valid: true }
  | { message: string; valid: false };

async function readImageDimensions(file: File): Promise<ImageDimensions> {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file);
    const dimensions = { height: bitmap.height, width: bitmap.width };
    bitmap.close();
    return dimensions;
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ height: image.naturalHeight, width: image.naturalWidth });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image dimensions could not be read.'));
    };
    image.src = objectUrl;
  });
}

export async function validateMediaUploadFile(
  file: File,
  getDimensions: DimensionsReader = readImageDimensions,
): Promise<MediaUploadValidation> {
  if (!acceptedImageTypes.has(file.type)) {
    return { message: 'Choose a PNG, JPEG, WebP, GIF, or AVIF image.', valid: false };
  }
  if (file.size > MAX_MEDIA_UPLOAD_BYTES) {
    return { message: 'Image files must be 10 MB or smaller.', valid: false };
  }
  try {
    const dimensions = await getDimensions(file);
    if (
      dimensions.width > MAX_MEDIA_UPLOAD_DIMENSION ||
      dimensions.height > MAX_MEDIA_UPLOAD_DIMENSION
    ) {
      return {
        message: 'Image dimensions must not exceed 5000 × 5000 pixels.',
        valid: false,
      };
    }
  } catch {
    return {
      message: 'Image dimensions could not be read. Choose a valid image and try again.',
      valid: false,
    };
  }
  return { valid: true };
}
