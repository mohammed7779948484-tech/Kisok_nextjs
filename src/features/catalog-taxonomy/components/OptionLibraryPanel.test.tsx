import type { DataProvider } from '@refinedev/core';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listOptionTypes: vi.fn(),
  reorderOptionTypes: vi.fn(),
  reorderOptionValues: vi.fn(),
  deleteOptionValue: vi.fn(),
}));

vi.mock('../repositories', () => ({
  catalogTaxonomyRepository: {
    listOptionTypes: testContext.listOptionTypes,
    reorderOptionTypes: testContext.reorderOptionTypes,
    reorderOptionValues: testContext.reorderOptionValues,
    deleteOptionValue: testContext.deleteOptionValue,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('asks for confirmation before deactivating an Option Type, and proceeds on confirm', async () => {
    const { dataProvider } = buildDataProvider();
    const update = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { ...optionTypeRow, ...(variables as object) },
    }));
    (dataProvider as DataProvider).update = update as DataProvider['update'];

    const user = userEvent.setup();
    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    await user.click(await screen.findByRole('button', { name: 'Deactivate Flavor' }));
    expect(update).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/may hide Products\/Variants that depend on it/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Deactivate' }));

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

  it('leaves the Option Type active and unmutated when the deactivate confirmation is cancelled', async () => {
    const { dataProvider } = buildDataProvider();
    const update = vi.fn();
    (dataProvider as DataProvider).update = update as DataProvider['update'];

    const user = userEvent.setup();
    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    await user.click(await screen.findByRole('button', { name: 'Deactivate Flavor' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(update).not.toHaveBeenCalled();
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

  it('asks for confirmation before deactivating an Option Value, and proceeds on confirm', async () => {
    const { dataProvider } = buildDataProvider();
    const update = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { ...optionValueRow, ...(variables as object) },
    }));
    (dataProvider as DataProvider).update = update as DataProvider['update'];

    const user = userEvent.setup();
    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    await user.click(await screen.findByRole('button', { name: 'Deactivate Berry' }));
    expect(update).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/may hide Products\/Variants that depend on it/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Deactivate' }));

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

  it('leaves the Option Value active and unmutated when the deactivate confirmation is cancelled', async () => {
    const { dataProvider } = buildDataProvider();
    const update = vi.fn();
    (dataProvider as DataProvider).update = update as DataProvider['update'];

    const user = userEvent.setup();
    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    await user.click(await screen.findByRole('button', { name: 'Deactivate Berry' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(update).not.toHaveBeenCalled();
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

  it('disables Option Type move buttons for every row while an Option Type reorder is in flight', async () => {
    const { dataProvider } = buildDataProvider();
    let resolveReorder!: () => void;
    testContext.listOptionTypes.mockResolvedValue([
      { id: 'option-type-1', name: 'Flavor', isActive: true, displayOrder: 0, values: [] },
      { id: 'option-type-2', name: 'Size', isActive: true, displayOrder: 1, values: [] },
    ]);
    testContext.reorderOptionTypes.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveReorder = resolve;
      }),
    );

    const user = userEvent.setup();
    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    await screen.findAllByText('Flavor');
    await user.click(screen.getByRole('button', { name: 'Move Flavor down' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Move Flavor up' })).toBeDisabled(),
    );

    resolveReorder();
  });

  it('disables Option Value move buttons for every row while an Option Value reorder is in flight', async () => {
    const { dataProvider } = buildDataProvider();
    let resolveReorder!: () => void;
    testContext.reorderOptionValues.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveReorder = resolve;
      }),
    );

    const user = userEvent.setup();
    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    await screen.findByText('Berry');
    await user.click(screen.getByRole('button', { name: 'Move Berry down' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Move Vanilla up' })).toBeDisabled(),
    );

    resolveReorder();
  });

  it('shows a distinct error state with Retry when Option Values fail to load, not the empty state', async () => {
    const getList = vi.fn(async (params: { resource: string }) => {
      if (params.resource === 'option_values') {
        throw new Error('network down');
      }
      return { data: [optionTypeRow], total: 1 };
    });
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    await screen.findAllByText('Flavor');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Values could not be loaded. Check the connection and try again.',
    );
    expect(screen.queryByText('No Values yet for this Option Type.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('retries loading Option Values when Try again is clicked after a failure', async () => {
    let shouldFail = true;
    const getList = vi.fn(async (params: { resource: string }) => {
      if (params.resource === 'option_values') {
        if (shouldFail) throw new Error('network down');
        return { data: [optionValueRow], total: 1 };
      }
      return { data: [optionTypeRow], total: 1 };
    });
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });
    const user = userEvent.setup();

    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    await screen.findAllByText('Flavor');
    await screen.findByRole('alert');

    shouldFail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Berry')).toBeInTheDocument();
  });

  it('asks for destructive confirmation before hard-deleting an Option Value, and proceeds on confirm', async () => {
    const { dataProvider } = buildDataProvider();
    testContext.deleteOptionValue.mockResolvedValue({ outcome: 'deleted' });

    const user = userEvent.setup();
    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    await user.click(await screen.findByRole('button', { name: 'Delete Berry' }));
    expect(testContext.deleteOptionValue).not.toHaveBeenCalled();
    expect(await screen.findByText(/this cannot be undone/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(testContext.deleteOptionValue).toHaveBeenCalledWith('option-value-1'),
    );
  });

  it('leaves the Option Value untouched when the delete confirmation is cancelled', async () => {
    const { dataProvider } = buildDataProvider();

    const user = userEvent.setup();
    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    await user.click(await screen.findByRole('button', { name: 'Delete Berry' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(testContext.deleteOptionValue).not.toHaveBeenCalled();
  });

  it('shows a clear in-use message instead of a generic failure when the Option Value is still referenced by Variants', async () => {
    const { dataProvider } = buildDataProvider();
    testContext.deleteOptionValue.mockResolvedValue({
      outcome: 'in-use',
      message:
        'Berry is still used by existing Variants and cannot be deleted — deactivate it instead.',
    });

    const user = userEvent.setup();
    renderWithRefine(<OptionLibraryPanel />, dataProvider, ['option_types', 'option_values']);

    await user.click(await screen.findByRole('button', { name: 'Delete Berry' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      await screen.findByText(
        'Berry is still used by existing Variants and cannot be deleted — deactivate it instead.',
      ),
    ).toBeInTheDocument();
  });
});
