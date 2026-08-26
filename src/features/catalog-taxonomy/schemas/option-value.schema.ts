import { z } from 'zod';

/** Field names match the `option_values` table's own columns — see `brand.schema.ts`. */
export const optionValueFormSchema = z.object({
  option_type_id: z.string().min(1, 'An Option Type is required.'),
  value: z
    .string()
    .trim()
    .min(1, 'Option Value is required.')
    .max(120, 'Option Value must be 120 characters or fewer.'),
  is_active: z.boolean(),
});

export type OptionValueFormValues = z.infer<typeof optionValueFormSchema>;

export function optionValueFormDefaultValues(optionTypeId: string): OptionValueFormValues {
  return { option_type_id: optionTypeId, value: '', is_active: true };
}
