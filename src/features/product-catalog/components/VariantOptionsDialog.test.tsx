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

  it('rejects saving a Variant combination that duplicates a sibling regardless of selection order', async () => {
    testContext.replaceVariantOptionValues.mockClear();
    const user = userEvent.setup();
    testContext.listVariantOptionValues.mockImplementation((variantId: string) =>
      Promise.resolve(
        variantId === 'variant-2'
          ? [
              {
                optionTypeId: 'type-size',
                optionTypeName: 'Size',
                optionValueId: 'value-large',
                optionValueName: 'Large',
              },
              {
                optionTypeId: 'type-flavor',
                optionTypeName: 'Flavor',
                optionValueId: 'value-berry',
                optionValueName: 'Berry',
              },
            ]
          : [
              {
                optionTypeId: 'type-flavor',
                optionTypeName: 'Flavor',
                optionValueId: 'value-berry',
                optionValueName: 'Berry',
              },
              {
                optionTypeId: 'type-size',
                optionTypeName: 'Size',
                optionValueId: 'value-large',
                optionValueName: 'Large',
              },
            ],
      ),
    );

    render(
      <VariantOptionsDialog
        onOpenChange={() => undefined}
        open
        optionTypes={OPTION_TYPES}
        siblingVariants={[{ id: 'variant-2', sku: 'KSK-000002' }]}
        variantId="variant-1"
        variantLabel="KSK-000001"
      />,
    );
    await screen.findByText('Flavor: Berry');
    await user.click(screen.getByRole('button', { name: 'Save combination' }));

    expect(await screen.findByText(/duplicates Variant KSK-000002/i)).toBeInTheDocument();
    expect(testContext.replaceVariantOptionValues).not.toHaveBeenCalled();
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

  it('prompts confirmation when attempting to close dirty Variant options', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
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
        onOpenChange={onOpenChange}
        open
        optionTypes={OPTION_TYPES}
        variantId="variant-1"
        variantLabel="KSK-000001"
      />,
    );
    await screen.findByText('Flavor: Berry');

    // Modify selections by removing Flavor: Berry
    await user.click(screen.getByRole('button', { name: 'Remove Flavor: Berry' }));

    // Click Cancel
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    // Confirm discard dialog appears
    expect(await screen.findByText('Discard unsaved Option changes?')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();

    // Confirm discard
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
