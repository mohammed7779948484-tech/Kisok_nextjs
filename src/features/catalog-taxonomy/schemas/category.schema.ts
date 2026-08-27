import { z } from 'zod';

/**
 * Field names match the `categories` table's own columns, mirroring
 * `brand.schema.ts`: Refine's Supabase data provider forwards these values
 * straight through to PostgREST as the insert/update payload.
 */
export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Category name is required.')
    .max(120, 'Category name must be 120 characters or fewer.'),
  parent_id: z.string().nullable(),
  is_active: z.boolean(),
  image_media_asset_id: z.string().nullable().optional(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const categoryFormDefaultValues: CategoryFormValues = {
  name: '',
  parent_id: null,
  is_active: true,
  image_media_asset_id: null,
};
