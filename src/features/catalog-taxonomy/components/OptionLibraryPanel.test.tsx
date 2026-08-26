import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listOptionTypes: vi.fn(),
  createOptionType: vi.fn(),
  createOptionValue: vi.fn(),
  updateOptionValue: vi.fn(),
}));

vi.mock('../repositories', () => ({
  catalogTaxonomyRepository: {
    listOptionTypes: testContext.listOptionTypes,
    createOptionType: testContext.createOptionType,
    createOptionValue: testContext.createOptionValue,
    updateOptionValue: testContext.updateOptionValue,
  },
}));

import { OptionLibraryPanel } from './OptionLibraryPanel';

describe('OptionLibraryPanel', () => {
  it('renders hosted Option Types and Values instead of local fixtures', async () => {
    testContext.listOptionTypes.mockResolvedValue([
      {
        id: 'option-type-1',
        name: 'Roast profile',
        isActive: true,
        displayOrder: 0,
        values: [{ id: 'option-value-1', value: 'Light', isActive: true, displayOrder: 0 }],
      },
    ]);

    render(<OptionLibraryPanel />);

    expect(await screen.findByRole('heading', { name: 'Roast profile' })).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.queryByText('Flavor')).not.toBeInTheDocument();
  });

  it('creates a hosted Option Type and dependent Value', async () => {
    const user = userEvent.setup();
    testContext.listOptionTypes.mockResolvedValue([
      {
        id: 'option-type-1',
        name: 'Flavor',
        isActive: true,
        displayOrder: 0,
        values: [],
      },
    ]);
    testContext.createOptionType.mockResolvedValue({
      id: 'option-type-2',
      name: 'Size',
      isActive: true,
      displayOrder: 1,
      values: [],
    });
    testContext.createOptionValue.mockResolvedValue({
      id: 'option-value-2',
      value: 'Large',
      isActive: true,
      displayOrder: 0,
    });

    render(<OptionLibraryPanel />);
    await screen.findByRole('heading', { name: 'Flavor' });
    await user.click(screen.getByRole('button', { name: 'Add Option Type' }));
    await user.type(screen.getByLabelText('Option Type name'), 'Size');
    await user.click(screen.getByRole('button', { name: 'Save Option Type' }));
    await waitFor(() =>
      expect(testContext.createOptionType).toHaveBeenCalledWith({ name: 'Size' }),
    );

    await user.click(screen.getByRole('button', { name: 'Add Value' }));
    await user.type(screen.getByLabelText('Option Value'), 'Large');
    await user.click(screen.getByRole('button', { name: 'Save Option Value' }));
    await waitFor(() =>
      expect(testContext.createOptionValue).toHaveBeenCalledWith({
        optionTypeId: 'option-type-1',
        value: 'Large',
      }),
    );
  });

  it('toggles a hosted Option Value active state', async () => {
    const user = userEvent.setup();
    testContext.listOptionTypes.mockResolvedValue([
      {
        id: 'option-type-1',
        name: 'Flavor',
        isActive: true,
        displayOrder: 0,
        values: [{ id: 'option-value-1', value: 'Berry', isActive: true, displayOrder: 0 }],
      },
    ]);
    testContext.updateOptionValue.mockResolvedValue({
      id: 'option-value-1',
      value: 'Berry',
      isActive: false,
      displayOrder: 0,
    });

    render(<OptionLibraryPanel />);
    await screen.findByText('Berry');
    await user.click(screen.getByRole('button', { name: 'Deactivate Berry' }));

    await waitFor(() =>
      expect(testContext.updateOptionValue).toHaveBeenCalledWith('option-value-1', {
        isActive: false,
      }),
    );
  });
});
