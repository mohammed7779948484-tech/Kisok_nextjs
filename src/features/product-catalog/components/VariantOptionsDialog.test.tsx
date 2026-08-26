import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listVariantOptionValues: vi.fn(),
  replaceVariantOptionValues: vi.fn(),
}));

vi.mock('../repositories', () => ({
  productCatalogRepository: {
    listVariantOptionValues: testContext.listVariantOptionValues,
    replaceVariantOptionValues: testContext.replaceVariantOptionValues,
  },
}));

import { VariantOptionsDialog } from './VariantOptionsDialog';

const OPTION_TYPES = [
  {
    id: 'type-flavor',
    name: 'Flavor',
    isActive: true,
    displayOrder: 0,
    values: [
      { id: 'value-berry', value: 'Berry', isActive: true, displayOrder: 0 },
      { id: 'value-cherry', value: 'Cherry', isActive: true, displayOrder: 1 },
    ],
  },
  {
    id: 'type-size',
    name: 'Size',
    isActive: true,
    displayOrder: 1,
    values: [{ id: 'value-large', value: 'Large', isActive: true, displayOrder: 0 }],
  },
  {
    id: 'type-retired',
    name: 'Retired Type',
    isActive: false,
    displayOrder: 2,
    values: [],
  },
];

describe('VariantOptionsDialog', () => {
  it('shows the current combination and hides inactive Option Types from the picker', async () => {
    testContext.listVariantOptionValues.mockResolvedValue([
      {
        optionTypeId: 'type-flavor',
        optionTypeName: 'Flavor',
        optionValueId: 'value-berry',
        optionValueName: 'Berry',
      },
    ]);

    render(
      <VariantOptionsDialog
        onOpenChange={() => undefined}
        open
        optionTypes={OPTION_TYPES}
        variantId="variant-1"
        variantLabel="KSK-000001"
      />,
    );

    expect(await screen.findByText('Flavor: Berry')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Option Type' }));
    expect(screen.queryByRole('option', { name: 'Retired Type' })).not.toBeInTheDocument();
  });

  it('adds a new Option Type/Value pair and submits the full combination', async () => {
    const user = userEvent.setup();
    testContext.listVariantOptionValues.mockResolvedValue([
      {
        optionTypeId: 'type-flavor',
        optionTypeName: 'Flavor',
        optionValueId: 'value-berry',
        optionValueName: 'Berry',
      },
    ]);
    testContext.replaceVariantOptionValues.mockResolvedValue(undefined);

    render(
      <VariantOptionsDialog
        onOpenChange={() => undefined}
        open
        optionTypes={OPTION_TYPES}
        variantId="variant-1"
        variantLabel="KSK-000001"
      />,
    );
    await screen.findByText('Flavor: Berry');

    await user.click(screen.getByRole('combobox', { name: 'Option Type' }));
    await user.click(await screen.findByRole('option', { name: 'Size' }));
    await user.click(screen.getByRole('combobox', { name: 'Option Value' }));
    await user.click(await screen.findByRole('option', { name: 'Large' }));
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Size: Large')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save combination' }));

    await waitFor(() =>
      expect(testContext.replaceVariantOptionValues).toHaveBeenCalledWith('variant-1', [
        { optionTypeId: 'type-flavor', optionValueId: 'value-berry' },
        { optionTypeId: 'type-size', optionValueId: 'value-large' },
      ]),
    );
  });

  it('removes a staged pair via its chip', async () => {
    const user = userEvent.setup();
    testContext.listVariantOptionValues.mockResolvedValue([
      {
        optionTypeId: 'type-flavor',
        optionTypeName: 'Flavor',
        optionValueId: 'value-berry',
        optionValueName: 'Berry',
      },
    ]);

    render(
      <VariantOptionsDialog
        onOpenChange={() => undefined}
        open
        optionTypes={OPTION_TYPES}
        variantId="variant-1"
        variantLabel="KSK-000001"
      />,
    );
    await screen.findByText('Flavor: Berry');

    await user.click(screen.getByRole('button', { name: 'Remove Flavor: Berry' }));

    expect(screen.queryByText('Flavor: Berry')).not.toBeInTheDocument();
  });
});
