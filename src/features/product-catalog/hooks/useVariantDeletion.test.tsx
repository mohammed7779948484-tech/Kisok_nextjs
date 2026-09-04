import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  deleteVariant: vi.fn(),
  updateVariant: vi.fn(),
}));

vi.mock('../repositories', () => ({
  productCatalogRepository: {
    deleteVariant: testContext.deleteVariant,
    updateVariant: testContext.updateVariant,
  },
}));

import { useVariantDeletion } from './useVariantDeletion';

const variant = {
  barcode: null,
  id: 'variant-1',
  isActive: true,
  lowStockThreshold: 5,
  productId: 'product-1',
  sku: 'KSK-000001',
  titleOverride: null,
};

describe('useVariantDeletion', () => {
  it('keeps the delete context and returns a professional error when hard deletion fails', async () => {
    testContext.deleteVariant.mockRejectedValue(new Error('Network unavailable.'));
    const { result } = renderHook(() => useVariantDeletion());

    act(() => result.current.begin(variant));
    await act(async () => result.current.confirm());

    expect(result.current.variant).toEqual(variant);
    expect(result.current.error).toBe('Network unavailable.');
    expect(result.current.historyBlocked).toBe(false);
  });

  it('clears the confirmation context after a successful hard deletion', async () => {
    const onCompleted = vi.fn();
    testContext.deleteVariant.mockResolvedValue({ outcome: 'deleted' });
    const { result } = renderHook(() => useVariantDeletion({ onCompleted }));

    act(() => result.current.begin(variant));
    await act(async () => result.current.confirm());

    expect(onCompleted).toHaveBeenCalledOnce();
    expect(result.current.variant).toBeNull();
    expect(result.current.historyBlocked).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isWorking).toBe(false);
  });

  it('clears the confirmation context after a history-blocked Variant is successfully deactivated', async () => {
    const onCompleted = vi.fn();
    testContext.deleteVariant.mockResolvedValue({ outcome: 'history-blocked' });
    testContext.updateVariant.mockResolvedValue(undefined);
    const { result } = renderHook(() => useVariantDeletion({ onCompleted }));

    act(() => result.current.begin(variant));
    await act(async () => result.current.confirm());
    expect(result.current.historyBlocked).toBe(true);

    await act(async () => result.current.confirm());

    expect(testContext.updateVariant).toHaveBeenCalledWith(variant.id, { isActive: false });
    expect(onCompleted).toHaveBeenCalledOnce();
    expect(result.current.variant).toBeNull();
    expect(result.current.historyBlocked).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isWorking).toBe(false);
  });
});
