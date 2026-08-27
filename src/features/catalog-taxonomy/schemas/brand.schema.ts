import { z } from 'zod';

/**
 * Field names deliberately match the `brands` table's own columns
 * (`name`, `is_active`) rather than a camelCase app shape: Refine's
 * Supabase data provider sends RHF's raw form values straight through to
 * PostgREST as the insert/update payload (see `useBrandForm`'s
 * `saveButtonProps`), so aligning the schema with the resource avoids a
 * translation layer that would otherwise sit between every field and the
 * database it writes to.
 */
export const brandFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Brand name is required.')
    .max(120, 'Brand name must be 120 characters or fewer.'),
  is_active: z.boolean(),
  image_media_asset_id: z.string().nullable().optional(),
});

export type BrandFormValues = z.infer<typeof brandFormSchema>;

export const brandFormDefaultValues: BrandFormValues = {
  name: '',
  is_active: true,
  image_media_asset_id: null,
};
