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
      isActive: false,
      lowStockThreshold: 5,
      titleOverride: 'Citrus Pack',
    });
  });
});
