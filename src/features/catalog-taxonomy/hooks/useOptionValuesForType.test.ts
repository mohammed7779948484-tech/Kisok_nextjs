import type { CrudFilters, DataProvider } from '@refinedev/core';
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createMockDataProvider, renderHookWithRefine } from '../../../../test/refine-test-utils';
import { useOptionValuesForType } from './useOptionValuesForType';

const optionValueRow = {
  id: 'option-value-1',
  option_type_id: 'option-type-1',
  value: 'Light',
  is_active: true,
  display_order: 0,
};

describe('useOptionValuesForType', () => {
  it('lists only the Values scoped to the given Option Type, in display order', async () => {
    const getList = vi.fn(async (_params: unknown) => ({ data: [optionValueRow], total: 1 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    const { result } = renderHookWithRefine(
      () => useOptionValuesForType('option-type-1'),
      dataProvider,
      ['option_values'],
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.optionValues).toEqual([
      { id: 'option-value-1', value: 'Light', isActive: true, displayOrder: 0 },
    ]);
    const call = getList.mock.calls[0][0] as { filters?: CrudFilters };
    expect(call.filters).toEqual([
      { field: 'option_type_id', operator: 'eq', value: 'option-type-1' },
    ]);
    expect(getList).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'option_values',
        sorters: [{ field: 'display_order', order: 'asc' }],
      }),
    );
  });

  it('does not query the data provider when no Option Type is selected', async () => {
    const getList = vi.fn(async (_params: unknown) => ({ data: [], total: 0 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    renderHookWithRefine(() => useOptionValuesForType(undefined), dataProvider, ['option_values']);

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(getList).not.toHaveBeenCalled();
  });
});
