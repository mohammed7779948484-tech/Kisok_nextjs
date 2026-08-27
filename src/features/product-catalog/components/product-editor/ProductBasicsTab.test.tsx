import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import {
  type ProductEditorFormValues,
  type ProductEditorValues,
  productEditorDefaultValues,
} from '../../schemas/product-editor.schema';
import { ProductBasicsTab } from './ProductBasicsTab';

function Harness() {
  const form = useForm<ProductEditorFormValues, undefined, ProductEditorValues>({
    defaultValues: productEditorDefaultValues,
  });
  return (
    <ProductBasicsTab canToggleActivation={false} form={form} isReadOnly={false} mode="edit" />
  );
}

describe('ProductBasicsTab', () => {
  it('keeps Product activation disabled until current Variant eligibility data is ready', () => {
    render(<Harness />);

    expect(
      screen.getByRole('checkbox', { name: 'Product activation waits for Variant eligibility' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });
});
