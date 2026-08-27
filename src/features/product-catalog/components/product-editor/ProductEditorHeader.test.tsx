import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={`/en${href}`} {...props}>
      {children}
    </a>
  ),
}));

import { ProductEditorHeader } from './ProductEditorHeader';

describe('ProductEditorHeader', () => {
  it('uses one accessible edit navigation control without nested interactive elements', () => {
    render(
      <ProductEditorHeader
        isReadOnly
        isSaving={false}
        mode="show"
        onLeave={vi.fn()}
        onSave={vi.fn()}
        productId="product-1"
        productName="Citrus Spark"
        saveDisabled
      />,
    );

    const editLink = screen.getByRole('link', { name: 'Edit Product' });
    expect(editLink).toHaveAttribute('href', '/en/admin/products/product-1/edit');
    expect(within(editLink).queryByRole('button')).not.toBeInTheDocument();
  });
});
