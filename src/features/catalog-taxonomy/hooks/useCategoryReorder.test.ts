import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listCategories: vi.fn(),
  reorderCategories: vi.fn(),
}));

vi.mock('../repositories', () => ({
  catalogTaxonomyRepository: {
    listCategories: testContext.listCategories,
    reorderCategories: testContext.reorderCategories,
  },
}));

import { useCategoryReorder } from './useCategoryReorder';

const allCategories = [
  { id: 'root-1', parentId: null },
  { id: 'root-2', parentId: null },
  { id: 'child-1', name: 'Espresso', parentId: 'root-1', isActive: true, displayOrder: 2 },
  { id: 'child-2', parentId: 'root-1' },
];

describe('useCategoryReorder', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('moves a root category up within its own scope only, via reorder_items', async () => {
    testContext.listCategories.mockResolvedValue(allCategories);
    testContext.reorderCategories.mockResolvedValue(undefined);
    const onReordered = vi.fn();

    const { result } = renderHook(() => useCategoryReorder(onReordered));

    await act(async () => {
      await result.current.move({ id: 'root-2', parentId: null }, 'up');
    });

    expect(testContext.reorderCategories).toHaveBeenCalledWith(null, ['root-2', 'root-1']);
    expect(onReordered).toHaveBeenCalled();
  });

  it('moves a child category within its parent scope, not the root scope', async () => {
    testContext.listCategories.mockResolvedValue(allCategories);
    testContext.reorderCategories.mockResolvedValue(undefined);
    const onReordered = vi.fn();

    const { result } = renderHook(() => useCategoryReorder(onReordered));

    await act(async () => {
      await result.current.move({ id: 'child-2', parentId: 'root-1' }, 'up');
    });

    expect(testContext.reorderCategories).toHaveBeenCalledWith('root-1', ['child-2', 'child-1']);
  });

  it('does nothing when the category is already at the edge of its scope', async () => {
    testContext.listCategories.mockResolvedValue(allCategories);
    const onReordered = vi.fn();

    const { result } = renderHook(() => useCategoryReorder(onReordered));

    await act(async () => {
      await result.current.move({ id: 'root-1', parentId: null }, 'up');
    });

    expect(testContext.reorderCategories).not.toHaveBeenCalled();
    expect(onReordered).not.toHaveBeenCalled();
  });

  it('exposes an isReordering flag while the move is in flight', async () => {
    let resolveReorder!: () => void;
    testContext.listCategories.mockResolvedValue(allCategories);
    testContext.reorderCategories.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveReorder = resolve;
      }),
    );
    const onReordered = vi.fn();

    const { result } = renderHook(() => useCategoryReorder(onReordered));

    let movePromise!: Promise<void>;
    act(() => {
      movePromise = result.current.move({ id: 'root-2', parentId: null }, 'up');
    });

    await waitFor(() => expect(result.current.isReordering).toBe(true));

    resolveReorder();
    await act(async () => {
      await movePromise;
    });

    expect(result.current.isReordering).toBe(false);
  });
});
