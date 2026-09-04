import type { DataProvider } from '@refinedev/core';
import { act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createMockDataProvider, renderHookWithRefine } from '../../../../test/refine-test-utils';
import { useOptionValueForm } from './useOptionValueForm';

describe('useOptionValueForm', () => {
  it('creates an Option Value scoped to its Option Type through the shared data provider', async () => {
    const create = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { id: 'option-value-new', ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({ create: create as DataProvider['create'] });

    const { result } = renderHookWithRefine(
      () => useOptionValueForm({ mode: 'create', optionTypeId: 'option-type-1' }),
      dataProvider,
      ['option_values'],
    );

    act(() => {
      result.current.setValue('value', 'Light');
    });

    await act(async () => {
      await result.current.handleSubmit((values) => result.current.refineCore.onFinish(values))();
    });

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'option_values',
        variables: { option_type_id: 'option-type-1', value: 'Light', is_active: true },
      }),
    );
  });

  it('rejects a blank value before ever calling the data provider', async () => {
    const create = vi.fn();
    const dataProvider = createMockDataProvider({
      create: create as unknown as DataProvider['create'],
    });

    const { result } = renderHookWithRefine(
      () => {
        const form = useOptionValueForm({ mode: 'create', optionTypeId: 'option-type-1' });
        void form.formState.errors;
        return form;
      },
      dataProvider,
      ['option_values'],
    );

    act(() => {
      result.current.setValue('value', '   ');
    });

    await act(async () => {
      await result.current.handleSubmit((values) => result.current.refineCore.onFinish(values))();
    });

    expect(create).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(result.current.formState.errors.value?.message).toBe('Option Value is required.'),
    );
  });

  it('updates an existing Option Value by id in edit mode', async () => {
    const getOne = vi.fn(async () => ({
      data: {
        id: 'option-value-1',
        option_type_id: 'option-type-1',
        value: 'Light',
        is_active: true,
      },
    }));
    const update = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { id: 'option-value-1', ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({
      getOne: getOne as DataProvider['getOne'],
      update: update as DataProvider['update'],
    });

    const { result } = renderHookWithRefine(
      () =>
        useOptionValueForm({ mode: 'edit', id: 'option-value-1', optionTypeId: 'option-type-1' }),
      dataProvider,
      ['option_values'],
    );

    await waitFor(() => expect(getOne).toHaveBeenCalled());

    act(() => {
      result.current.setValue('value', 'Medium light');
      result.current.setValue('is_active', false);
    });

    await act(async () => {
      await result.current.handleSubmit((values) => result.current.refineCore.onFinish(values))();
    });

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'option_values', id: 'option-value-1' }),
    );
  });
});
