import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
        variantEligibilityById={{
          'variant-1': { isCustomerEligible: false, reasons: ['Variant is inactive.'] },
        }}
        variantMediaCounts={{ 'variant-1': 2 }}
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

  it('renders explicit loading state while variants are being fetched', () => {
    render(
      <ProductVariantsTab
        onAddVariant={vi.fn()}
        onDeleteVariant={vi.fn()}
        onEditVariant={vi.fn()}
        onMedia={vi.fn()}
        onOptions={vi.fn()}
        productId="product-1"
        readOnly={false}
        variantEligibilityById={{}}
        variantMediaCounts={{}}
        variantOptionsById={{}}
        variants={[]}
        variantsStatus="loading"
      />,
    );

    expect(screen.getByText('Loading Variants…')).toBeInTheDocument();
    expect(screen.queryByText('No Variants yet')).not.toBeInTheDocument();
  });

  it('renders dedicated error banner with retry button on variant fetch failure', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(
      <ProductVariantsTab
        onAddVariant={vi.fn()}
        onDeleteVariant={vi.fn()}
        onEditVariant={vi.fn()}
        onMedia={vi.fn()}
        onOptions={vi.fn()}
        onRetryVariants={onRetry}
        productId="product-1"
        readOnly={false}
        variantEligibilityById={{}}
        variantMediaCounts={{}}
        variantOptionsById={{}}
        variants={[]}
        variantsError={new Error('Database network timeout')}
        variantsStatus="error"
      />,
    );

    expect(screen.getByText('Variants could not be loaded')).toBeInTheDocument();
    expect(screen.getByText('Database network timeout')).toBeInTheDocument();
    expect(screen.queryByText('No Variants yet')).not.toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /retry loading variants/i });
    await user.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders "Unavailable" for media count when media query failed rather than "0 images"', () => {
    render(
      <ProductVariantsTab
        onAddVariant={vi.fn()}
        onDeleteVariant={vi.fn()}
        onEditVariant={vi.fn()}
        onMedia={vi.fn()}
        onOptions={vi.fn()}
        productId="product-1"
        readOnly={false}
        variantEligibilityById={{}}
        variantMediaCounts={{}}
        variantMediaStatus="error"
        variantOptionsById={{}}
        variants={[
          {
            barcode: null,
            id: 'variant-1',
            isActive: true,
            lowStockThreshold: 5,
            productId: 'product-1',
            sku: 'KSK-000001',
            titleOverride: null,
          },
        ]}
      />,
    );

    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.queryByText('0 images')).not.toBeInTheDocument();
  });
});
