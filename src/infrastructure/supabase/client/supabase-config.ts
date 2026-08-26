export type SupabaseConfig = {
  url: string;
  key: string;
};

export function getSupabaseConfig(
  url: string | undefined,
  key: string | undefined,
): SupabaseConfig | null {
  const normalizedUrl = url?.trim();
  const normalizedKey = key?.trim();

  if (!(normalizedUrl && normalizedKey)) {
    return null;
  }

  return { url: normalizedUrl, key: normalizedKey };
}
