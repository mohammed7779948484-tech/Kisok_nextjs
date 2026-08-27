import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProductVariantsTab } from './ProductVariantsTab';

describe('ProductVariantsTab', () => {
  it('renders the actual loaded Media count for each Variant card', () => {
    render(
      <ProductVariantsTab
        onAddVariant={vi.fn()}
        onDeleteVariant={vi.fn()}
        onEditVariant={vi.fn()}
        onMedia={vi.fn()}
        onOptions={vi.fn()}
        productId="product-1"
        readOnly={false}
        variantMediaCounts={{ 'variant-1': 2 }}
        variantEligibilityById={{
          'variant-1': { isCustomerEligible: false, reasons: ['Variant is a draft.'] },
        }}
        variantOptionsById={{}}
        variants={[
          {
            barcode: null,
            id: 'variant-1',
            isActive: false,
            lowStockThreshold: 5,
            productId: 'product-1',
            sku: 'KSK-000001',
            titleOverride: null,
          },
        ]}
      />,
    );

    expect(screen.getByText('2 images')).toBeInTheDocument();
  });
});
