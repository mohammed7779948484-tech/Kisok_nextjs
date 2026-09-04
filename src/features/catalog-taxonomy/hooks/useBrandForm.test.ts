import type { DataProvider } from '@refinedev/core';
import { act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createMockDataProvider, renderHookWithRefine } from '../../../../test/refine-test-utils';
import { useBrandForm } from './useBrandForm';

describe('useBrandForm', () => {
  it('creates a Brand through the shared Refine data provider on submit', async () => {
    const create = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { id: 'brand-new', ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({ create: create as DataProvider['create'] });

    const { result } = renderHookWithRefine(() => useBrandForm({ mode: 'create' }), dataProvider, [
      'brands',
    ]);

    act(() => {
      result.current.setValue('name', 'Field Notes');
      result.current.setValue('is_active', true);
    });

    await act(async () => {
      await result.current.handleSubmit((values) => result.current.refineCore.onFinish(values))();
    });

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'brands',
        variables: { name: 'Field Notes', is_active: true, image_media_asset_id: null },
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
        const form = useBrandForm({ mode: 'create' });
        // RHF's `formState` is a lazily-subscribed Proxy: reading `.errors`
        // during render is what makes the hook re-render when it changes.
        void form.formState.errors;
        return form;
      },
      dataProvider,
      ['brands'],
    );

    act(() => {
      result.current.setValue('name', '   ');
    });

    await act(async () => {
      await result.current.handleSubmit((values) => result.current.refineCore.onFinish(values))();
    });

    expect(create).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(result.current.formState.errors.name?.message).toBe('Brand name is required.'),
    );
  });

  it('updates an existing Brand by id in edit mode', async () => {
    const getOne = vi.fn(async () => ({
      data: { id: 'brand-1', name: 'Northline', is_active: true, display_order: 0 },
    }));
    const update = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { id: 'brand-1', ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({
      getOne: getOne as DataProvider['getOne'],
      update: update as DataProvider['update'],
    });

    const { result } = renderHookWithRefine(
      () => useBrandForm({ mode: 'edit', id: 'brand-1' }),
      dataProvider,
      ['brands'],
    );

    await waitFor(() => expect(getOne).toHaveBeenCalled());

    act(() => {
      result.current.setValue('name', 'Northline Renamed');
      result.current.setValue('is_active', false);
    });

    await act(async () => {
      await result.current.handleSubmit((values) => result.current.refineCore.onFinish(values))();
    });

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'brands', id: 'brand-1' }),
    );
  });
});
