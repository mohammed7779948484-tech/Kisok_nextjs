import type { DataProvider } from '@refinedev/core';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listOptionTypes: vi.fn(),
  reorderOptionTypes: vi.fn(),
  reorderOptionValues: vi.fn(),
}));

vi.mock('../repositories', () => ({
  catalogTaxonomyRepository: {
    listOptionTypes: testContext.listOptionTypes,
    reorderOptionTypes: testContext.reorderOptionTypes,
    reorderOptionValues: testContext.reorderOptionValues,
  },
}));

import { createMockDataProvider, renderWithRefine } from '../../../../test/refine-test-utils';
import { OptionLibraryPanel } from './OptionLibraryPanel';

const optionTypeRow = {
  id: 'option-type-1',
  name: 'Flavor',
  is_active: true,
  display_order: 0,
};

const optionValueRow = {
  id: 'option-value-1',
  option_type_id: 'option-type-1',
  value: 'Berry',
  is_active: true,
  display_order: 0,
};

const secondOptionValueRow = {
  id: 'option-value-2',
  option_type_id: 'option-type-1',
  value: 'Vanilla',
  is_active: true,
  display_order: 1,
};

function buildDataProvider(overrides: Partial<DataProvider> = {}) {
  const getList = vi.fn(async (params: { resource: string; filters?: unknown[] }) => {
    if (params.resource === 'option_values') {
      return { data: [optionValueRow, secondOptionValueRow], total: 2 };
    }
    return { data: [optionTypeRow], total: 1 };
  });
  return {
    dataProvider: createMockDataProvider({
      getList: getList as DataProvider['getList'],
      ...overrides,
    }),
    getList,
  };
}

describe('OptionLibraryPanel', () => {
  it('renders hosted Option Types and the selected Type’s Values through Refine list state', async () => {
    const { dataProvider } = buildDataProvider();

    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    expect((await screen.findAllByText('Flavor')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Berry')).toBeInTheDocument();
  });

  it('debounces Option Type search input into a contains-filtered list request', async () => {
    const { dataProvider, getList } = buildDataProvider();
    const user = userEvent.setup();

    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);
    await screen.findAllByText('Flavor');
    const callsBeforeTyping = getList.mock.calls.length;

    await user.type(screen.getByPlaceholderText('Search Option Types'), 'roast');

    await waitFor(
      () => {
        expect(getList.mock.calls.length).toBeGreaterThan(callsBeforeTyping);
        const lastCall = getList.mock.calls.find(
          (call) => call[0].resource === 'option_types' && call[0].filters?.length,
        )?.[0] as { filters?: unknown } | undefined;
        expect(lastCall?.filters).toEqual([
          { field: 'name', operator: 'contains', value: 'roast' },
        ]);
      },
      { timeout: 2000 },
    );
  });

  it('creates an Option Type through the shared Refine data provider', async () => {
    const { dataProvider } = buildDataProvider();
    const create = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { id: 'option-type-2', ...(variables as object) },
    }));
    (dataProvider as DataProvider).create = create as DataProvider['create'];

    const user = userEvent.setup();
    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    await user.click(await screen.findByRole('button', { name: 'Add Option Type' }));
    await user.type(screen.getByLabelText('Option Type name'), 'Size');
    await user.click(screen.getByRole('button', { name: 'Save Option Type' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'option_types',
          variables: { name: 'Size', is_active: true },
        }),
      ),
    );
  });

  it('toggles an Option Type active state without opening the edit form', async () => {
    const { dataProvider } = buildDataProvider();
    const update = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { ...optionTypeRow, ...(variables as object) },
    }));
    (dataProvider as DataProvider).update = update as DataProvider['update'];

    const user = userEvent.setup();
    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    await user.click(await screen.findByRole('button', { name: 'Deactivate Flavor' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'option_types',
          id: 'option-type-1',
          variables: { is_active: false },
        }),
      ),
    );
  });

  it('creates an Option Value scoped to the selected Option Type', async () => {
    const { dataProvider } = buildDataProvider();
    const create = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { id: 'option-value-2', ...(variables as object) },
    }));
    (dataProvider as DataProvider).create = create as DataProvider['create'];

    const user = userEvent.setup();
    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    await screen.findByText('Berry');
    await user.click(screen.getByRole('button', { name: 'Add Value' }));
    await user.type(screen.getByLabelText('Option Value'), 'Large');
    await user.click(screen.getByRole('button', { name: 'Save Option Value' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'option_values',
          variables: { option_type_id: 'option-type-1', value: 'Large', is_active: true },
        }),
      ),
    );
  });

  it('toggles an Option Value active state', async () => {
    const { dataProvider } = buildDataProvider();
    const update = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { ...optionValueRow, ...(variables as object) },
    }));
    (dataProvider as DataProvider).update = update as DataProvider['update'];

    const user = userEvent.setup();
    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    await user.click(await screen.findByRole('button', { name: 'Deactivate Berry' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'option_values',
          id: 'option-value-1',
          variables: { is_active: false },
        }),
      ),
    );
  });

  it('reorders an Option Value within its Option Type scope through the repository RPC', async () => {
    const { dataProvider } = buildDataProvider();
    testContext.reorderOptionValues.mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    await screen.findByText('Berry');
    await user.click(screen.getByRole('button', { name: 'Move Berry down' }));

    await waitFor(() =>
      expect(testContext.reorderOptionValues).toHaveBeenCalledWith('option-type-1', [
        'option-value-2',
        'option-value-1',
      ]),
    );
  });
});
