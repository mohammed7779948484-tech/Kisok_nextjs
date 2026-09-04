import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listBrands: vi.fn(),
  reorderBrands: vi.fn(),
}));

vi.mock('../repositories', () => ({
  catalogTaxonomyRepository: {
    listBrands: testContext.listBrands,
    reorderBrands: testContext.reorderBrands,
  },
}));

import { useBrandReorder } from './useBrandReorder';

const allBrands = [
  { id: 'brand-1' },
  { id: 'brand-2', name: 'Northline', isActive: true, displayOrder: 1 },
  { id: 'brand-3' },
];

describe('useBrandReorder', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('moves a Brand down within the global scope, via reorder_items', async () => {
    testContext.listBrands.mockResolvedValue(allBrands);
    testContext.reorderBrands.mockResolvedValue(undefined);
    const onReordered = vi.fn();

    const { result } = renderHook(() => useBrandReorder(onReordered));

    await act(async () => {
      await result.current.move({ id: 'brand-1' }, 'down');
    });

    expect(testContext.reorderBrands).toHaveBeenCalledWith(['brand-2', 'brand-1', 'brand-3']);
    expect(onReordered).toHaveBeenCalled();
  });

  it('does nothing when the Brand is already at the edge of the scope', async () => {
    testContext.listBrands.mockResolvedValue(allBrands);
    const onReordered = vi.fn();

    const { result } = renderHook(() => useBrandReorder(onReordered));

    await act(async () => {
      await result.current.move({ id: 'brand-3' }, 'down');
    });

    expect(testContext.reorderBrands).not.toHaveBeenCalled();
    expect(onReordered).not.toHaveBeenCalled();
  });

  it('exposes an isReordering flag while the move is in flight', async () => {
    let resolveReorder!: () => void;
    testContext.listBrands.mockResolvedValue(allBrands);
    testContext.reorderBrands.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveReorder = resolve;
      }),
    );

    const { result } = renderHook(() => useBrandReorder(vi.fn()));

    let movePromise!: Promise<void>;
    act(() => {
      movePromise = result.current.move({ id: 'brand-1' }, 'down');
    });

    await waitFor(() => expect(result.current.isReordering).toBe(true));

    resolveReorder();
    await act(async () => {
      await movePromise;
    });

    expect(result.current.isReordering).toBe(false);
  });
});
