import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listOptionTypes: vi.fn(),
  reorderOptionTypes: vi.fn(),
}));

vi.mock('../repositories', () => ({
  catalogTaxonomyRepository: {
    listOptionTypes: testContext.listOptionTypes,
    reorderOptionTypes: testContext.reorderOptionTypes,
  },
}));

import { useOptionTypeReorder } from './useOptionTypeReorder';

const allOptionTypes = [
  { id: 'type-1' },
  { id: 'type-2', name: 'Size', isActive: true, displayOrder: 1, values: [] },
  { id: 'type-3' },
];

describe('useOptionTypeReorder', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('moves an Option Type down within the global scope, via reorder_items', async () => {
    testContext.listOptionTypes.mockResolvedValue(allOptionTypes);
    testContext.reorderOptionTypes.mockResolvedValue(undefined);
    const onReordered = vi.fn();

    const { result } = renderHook(() => useOptionTypeReorder(onReordered));

    await act(async () => {
      await result.current.move({ id: 'type-1' }, 'down');
    });

    expect(testContext.reorderOptionTypes).toHaveBeenCalledWith(['type-2', 'type-1', 'type-3']);
    expect(onReordered).toHaveBeenCalled();
  });

  it('does nothing when the Option Type is already at the edge of the scope', async () => {
    testContext.listOptionTypes.mockResolvedValue(allOptionTypes);
    const onReordered = vi.fn();

    const { result } = renderHook(() => useOptionTypeReorder(onReordered));

    await act(async () => {
      await result.current.move({ id: 'type-3' }, 'down');
    });

    expect(testContext.reorderOptionTypes).not.toHaveBeenCalled();
    expect(onReordered).not.toHaveBeenCalled();
  });

  it('exposes an isReordering flag while the move is in flight', async () => {
    let resolveReorder!: () => void;
    testContext.listOptionTypes.mockResolvedValue(allOptionTypes);
    testContext.reorderOptionTypes.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveReorder = resolve;
      }),
    );

    const { result } = renderHook(() => useOptionTypeReorder(vi.fn()));

    let movePromise!: Promise<void>;
    act(() => {
      movePromise = result.current.move({ id: 'type-1' }, 'down');
    });

    await waitFor(() => expect(result.current.isReordering).toBe(true));

    resolveReorder();
    await act(async () => {
      await movePromise;
    });

    expect(result.current.isReordering).toBe(false);
  });
});
