import { z } from 'zod';

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null);

export const variantEditorSchema = z.object({
  barcode: optionalText,
  initialQuantity: z
    .string()
    .trim()
    .default('0')
    .transform((value, context) => {
      if (value === '') return 0;
      const number = Number(value);
      if (!Number.isInteger(number) || number < 0 || number > 2147483647) {
        context.addIssue({
          code: 'custom',
          message: 'Enter a non-negative whole number (up to 2,147,483,647).',
        });
        return z.NEVER;
      }
      return number;
    }),
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
  initialQuantity: '0',
  isActive: false,
  lowStockThreshold: '5',
  titleOverride: '',
};
