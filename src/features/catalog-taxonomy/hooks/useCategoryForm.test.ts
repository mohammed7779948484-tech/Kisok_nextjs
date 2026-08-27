import type { DataProvider } from '@refinedev/core';
import { act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createMockDataProvider, renderHookWithRefine } from '../../../../test/refine-test-utils';
import { useCategoryForm } from './useCategoryForm';

describe('useCategoryForm', () => {
  it('creates a root Category through the shared Refine data provider on submit', async () => {
    const create = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { id: 'category-new', ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({ create: create as DataProvider['create'] });

    const { result } = renderHookWithRefine(
      () => useCategoryForm({ mode: 'create' }),
      dataProvider,
      ['categories'],
    );

    act(() => {
      result.current.setValue('name', 'Coffee');
      result.current.setValue('parent_id', null);
      result.current.setValue('is_active', true);
    });

    await act(async () => {
      await result.current.handleSubmit((values) => result.current.refineCore.onFinish(values))();
    });

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'categories',
        variables: { name: 'Coffee', parent_id: null, is_active: true, image_media_asset_id: null },
      }),
    );
  });

  it('creates a child Category with a parent_id', async () => {
    const create = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { id: 'category-child', ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({ create: create as DataProvider['create'] });

    const { result } = renderHookWithRefine(
      () => useCategoryForm({ mode: 'create' }),
      dataProvider,
      ['categories'],
    );

    act(() => {
      result.current.setValue('name', 'Cold Drinks');
      result.current.setValue('parent_id', 'category-1');
      result.current.setValue('is_active', true);
    });

    await act(async () => {
      await result.current.handleSubmit((values) => result.current.refineCore.onFinish(values))();
    });

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'categories',
          variables: {
            name: 'Cold Drinks',
            parent_id: 'category-1',
            is_active: true,
            image_media_asset_id: null,
          },
        }),
      ),
    );
  });

  it('rejects a blank name before ever calling the data provider', async () => {
    const create = vi.fn();
    const dataProvider = createMockDataProvider({
      create: create as unknown as DataProvider['create'],
    });

    const { result } = renderHookWithRefine(
      () => {
        const form = useCategoryForm({ mode: 'create' });
        void form.formState.errors;
        return form;
      },
      dataProvider,
      ['categories'],
    );

    act(() => {
      result.current.setValue('name', '   ');
    });

    await act(async () => {
      await result.current.handleSubmit((values) => result.current.refineCore.onFinish(values))();
    });

    expect(create).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(result.current.formState.errors.name?.message).toBe('Category name is required.'),
    );
  });

  it('updates an existing Category by id in edit mode', async () => {
    const getOne = vi.fn(async () => ({
      data: { id: 'category-1', name: 'Coffee', parent_id: null, is_active: true },
    }));
    const update = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { id: 'category-1', ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({
      getOne: getOne as DataProvider['getOne'],
      update: update as DataProvider['update'],
    });

    const { result } = renderHookWithRefine(
      () => useCategoryForm({ mode: 'edit', id: 'category-1' }),
      dataProvider,
      ['categories'],
    );

    await waitFor(() => expect(getOne).toHaveBeenCalled());

    act(() => {
      result.current.setValue('name', 'Hot Coffee');
      result.current.setValue('parent_id', null);
      result.current.setValue('is_active', false);
    });

    await act(async () => {
      await result.current.handleSubmit((values) => result.current.refineCore.onFinish(values))();
    });

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'categories', id: 'category-1' }),
    );
  });
});
