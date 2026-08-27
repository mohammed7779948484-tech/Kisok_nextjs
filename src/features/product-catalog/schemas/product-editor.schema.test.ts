import { describe, expect, it } from 'vitest';

import { productEditorSchema } from './product-editor.schema';

describe('productEditorSchema', () => {
  it('normalizes comma-separated Product search keywords without changing draft activation state', () => {
    const parsed = productEditorSchema.parse({
      brandId: null,
      categoryIds: ['category-1'],
      coverMediaAssetId: 'media-1',
      isActive: false,
      isFeatured: false,
      name: ' Citrus Spark ',
      searchKeywords: ' citrus, sparkling , citrus, ',
      shortDescription: '  Bright and crisp.  ',
    });

    expect(parsed).toMatchObject({
      isActive: false,
      name: 'Citrus Spark',
      searchKeywords: ['citrus', 'sparkling'],
      shortDescription: 'Bright and crisp.',
    });
  });
});
