import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  reorderOptionValues: vi.fn(),
}));

vi.mock('../repositories', () => ({
  catalogTaxonomyRepository: {
    reorderOptionValues: testContext.reorderOptionValues,
  },
}));

import { useOptionValueReorder } from './useOptionValueReorder';

const values = [
  { id: 'value-1', value: 'Light', isActive: true, displayOrder: 0 },
  { id: 'value-2', value: 'Medium', isActive: true, displayOrder: 1 },
  { id: 'value-3', value: 'Dark', isActive: true, displayOrder: 2 },
];

describe('useOptionValueReorder', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reorders Values within the given Option Type scope, using the already-loaded list', async () => {
    testContext.reorderOptionValues.mockResolvedValue(undefined);
    const onReordered = vi.fn();

    const { result } = renderHook(() =>
      useOptionValueReorder('option-type-1', values, onReordered),
    );

    await act(async () => {
      await result.current.move(values[1], 'up');
    });

    expect(testContext.reorderOptionValues).toHaveBeenCalledWith('option-type-1', [
      'value-2',
      'value-1',
      'value-3',
    ]);
    expect(onReordered).toHaveBeenCalled();
  });

  it('does nothing when the Value is already at the edge of the scope', async () => {
    const onReordered = vi.fn();
    const { result } = renderHook(() =>
      useOptionValueReorder('option-type-1', values, onReordered),
    );

    await act(async () => {
      await result.current.move(values[0], 'up');
    });

    expect(testContext.reorderOptionValues).not.toHaveBeenCalled();
    expect(onReordered).not.toHaveBeenCalled();
  });

  it('exposes an isReordering flag while the move is in flight', async () => {
    let resolveReorder!: () => void;
    testContext.reorderOptionValues.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveReorder = resolve;
      }),
    );

    const { result } = renderHook(() => useOptionValueReorder('option-type-1', values, vi.fn()));

    let movePromise!: Promise<void>;
    act(() => {
      movePromise = result.current.move(values[1], 'up');
    });

    await waitFor(() => expect(result.current.isReordering).toBe(true));

    resolveReorder();
    await act(async () => {
      await movePromise;
    });

    expect(result.current.isReordering).toBe(false);
  });
});
