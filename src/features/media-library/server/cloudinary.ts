import { createHash } from 'node:crypto';

export type CloudinaryUploadParameters = Record<
  string,
  string | number | boolean | null | undefined
>;

const UNSIGNED_KEYS = new Set(['api_key', 'cloud_name', 'file', 'resource_type', 'signature']);

export function createCloudinaryUploadSignature(
  parameters: CloudinaryUploadParameters,
  apiSecret: string,
): string {
  if (!apiSecret) {
    throw new Error('Cloudinary API secret is required on the server.');
  }

  const canonical = Object.entries(parameters)
    .filter(
      ([key, value]) =>
        !UNSIGNED_KEYS.has(key) && value !== null && value !== undefined && value !== '',
    )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&');

  return createHash('sha1').update(`${canonical}${apiSecret}`).digest('hex');
}
