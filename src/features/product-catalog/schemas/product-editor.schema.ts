import { z } from 'zod';

function normalizeSearchKeywords(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

export const productEditorSchema = z.object({
  brandId: z.string().nullable(),
  categoryIds: z.array(z.string()).transform((categoryIds) => [...new Set(categoryIds)]),
  coverMediaAssetId: z.string().nullable(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  name: z.string().trim().min(1, 'Product name is required.'),
  searchKeywords: z.string().transform(normalizeSearchKeywords),
  shortDescription: z.string().trim(),
});

export type ProductEditorFormValues = z.input<typeof productEditorSchema>;
export type ProductEditorValues = z.output<typeof productEditorSchema>;

export const productEditorDefaultValues: ProductEditorFormValues = {
  brandId: null,
  categoryIds: [],
  coverMediaAssetId: null,
  isActive: false,
  isFeatured: false,
  name: '',
  searchKeywords: '',
  shortDescription: '',
};

export function optionalText(value: string): string | null {
  return value || null;
}
