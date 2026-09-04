import { describe, expect, it } from 'vitest';

import { variantEditorSchema } from './variant-editor.schema';

describe('variantEditorSchema', () => {
  it('normalizes optional operational text and validates a non-negative low-stock threshold', () => {
    const parsed = variantEditorSchema.parse({
      barcode: '  ',
      isActive: false,
      lowStockThreshold: ' 5 ',
      titleOverride: ' Citrus Pack ',
    });

    expect(parsed).toEqual({
      barcode: null,
      initialQuantity: 0,
      isActive: false,
      lowStockThreshold: 5,
      titleOverride: 'Citrus Pack',
    });
  });

  it('validates initial stock quantity as a non-negative integer', () => {
    const valid = variantEditorSchema.parse({
      barcode: '',
      initialQuantity: ' 25 ',
      isActive: true,
      lowStockThreshold: '5',
      titleOverride: '',
    });
    expect(valid.initialQuantity).toBe(25);

    expect(() =>
      variantEditorSchema.parse({
        barcode: '',
        initialQuantity: '-5',
        isActive: true,
        lowStockThreshold: '5',
        titleOverride: '',
      }),
    ).toThrow();

    expect(() =>
      variantEditorSchema.parse({
        barcode: '',
        initialQuantity: '2.5',
        isActive: true,
        lowStockThreshold: '5',
        titleOverride: '',
      }),
    ).toThrow();
  });
});
