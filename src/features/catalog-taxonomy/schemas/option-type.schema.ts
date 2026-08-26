import { z } from 'zod';

/** Field names match the `option_types` table's own columns — see `brand.schema.ts`. */
export const optionTypeFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Option Type name is required.')
    .max(120, 'Option Type name must be 120 characters or fewer.'),
  is_active: z.boolean(),
});

export type OptionTypeFormValues = z.infer<typeof optionTypeFormSchema>;

export const optionTypeFormDefaultValues: OptionTypeFormValues = {
  name: '',
  is_active: true,
};
