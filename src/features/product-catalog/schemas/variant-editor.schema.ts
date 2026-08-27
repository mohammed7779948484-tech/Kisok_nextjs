import { z } from 'zod';

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null);

export const variantEditorSchema = z.object({
  barcode: optionalText,
  isActive: z.boolean(),
  lowStockThreshold: z
    .string()
    .trim()
    .transform((value, context) => {
      if (value === '') return null;
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) {
        context.addIssue({ code: 'custom', message: 'Enter a non-negative low-stock threshold.' });
        return z.NEVER;
      }
      return number;
    }),
  titleOverride: optionalText,
});

export type VariantEditorFormValues = z.input<typeof variantEditorSchema>;
export type VariantEditorValues = z.output<typeof variantEditorSchema>;

export const variantEditorDefaultValues: VariantEditorFormValues = {
  barcode: '',
  isActive: false,
  lowStockThreshold: '5',
  titleOverride: '',
};
