import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProductVariantCard } from './ProductVariantCard';

describe('ProductVariantCard', () => {
  it('shows an actionable customer-hidden state for a Variant that cannot appear in the catalog', () => {
    render(
      <ProductVariantCard
        eligibility={{
          isCustomerEligible: false,
          reasons: ['Uses inactive Option Value “Berry”.'],
        }}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onMedia={vi.fn()}
        onOptions={vi.fn()}
        readOnly={false}
        selections={[]}
        variant={{
          barcode: null,
          id: 'variant-1',
          isActive: true,
          lowStockThreshold: 5,
          productId: 'product-1',
          sku: 'KSK-000001',
          titleOverride: null,
        }}
      />,
    );

    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('Uses inactive Option Value “Berry”.')).toBeInTheDocument();
  });
});
