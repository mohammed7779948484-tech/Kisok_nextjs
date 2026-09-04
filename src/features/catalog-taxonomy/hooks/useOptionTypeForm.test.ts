import type { DataProvider } from '@refinedev/core';
import { act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createMockDataProvider, renderHookWithRefine } from '../../../../test/refine-test-utils';
import { useOptionTypeForm } from './useOptionTypeForm';

describe('useOptionTypeForm', () => {
  it('creates an Option Type through the shared Refine data provider on submit', async () => {
    const create = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { id: 'option-type-new', ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({ create: create as DataProvider['create'] });

    const { result } = renderHookWithRefine(
      () => useOptionTypeForm({ mode: 'create' }),
      dataProvider,
      ['option_types'],
    );

    act(() => {
      result.current.setValue('name', 'Roast profile');
      result.current.setValue('is_active', true);
    });

    await act(async () => {
      await result.current.handleSubmit((values) => result.current.refineCore.onFinish(values))();
    });

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'option_types',
        variables: { name: 'Roast profile', is_active: true },
      }),
    );
  });

  it('rejects a blank name before ever calling the data provider', async () => {
    const create = vi.fn();
    const dataProvider = createMockDataProvider({
      create: create as unknown as DataProvider['create'],
    });

    const { result } = renderHookWithRefine(
      () => {
        const form = useOptionTypeForm({ mode: 'create' });
        void form.formState.errors;
        return form;
      },
      dataProvider,
      ['option_types'],
    );

    act(() => {
      result.current.setValue('name', '   ');
    });

    await act(async () => {
      await result.current.handleSubmit((values) => result.current.refineCore.onFinish(values))();
    });

    expect(create).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(result.current.formState.errors.name?.message).toBe('Option Type name is required.'),
    );
  });

  it('updates an existing Option Type by id in edit mode', async () => {
    const getOne = vi.fn(async () => ({
      data: { id: 'option-type-1', name: 'Flavor', is_active: true },
    }));
    const update = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { id: 'option-type-1', ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({
      getOne: getOne as DataProvider['getOne'],
      update: update as DataProvider['update'],
    });

    const { result } = renderHookWithRefine(
      () => useOptionTypeForm({ mode: 'edit', id: 'option-type-1' }),
      dataProvider,
      ['option_types'],
    );

    await waitFor(() => expect(getOne).toHaveBeenCalled());

    act(() => {
      result.current.setValue('name', 'Flavor profile');
      result.current.setValue('is_active', false);
    });

    await act(async () => {
      await result.current.handleSubmit((values) => result.current.refineCore.onFinish(values))();
    });

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'option_types', id: 'option-type-1' }),
    );
  });
});
