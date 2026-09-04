import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listVariantOptionValues: vi.fn(),
  replaceVariantOptionValues: vi.fn(),
}));

vi.mock('../repositories', () => ({
  productCatalogRepository: {
    listVariantOptionValues: testContext.listVariantOptionValues,
    replaceVariantOptionValues: testContext.replaceVariantOptionValues,
  },
}));

import { useVariantOptionValues } from './useVariantOptionValues';

describe('useVariantOptionValues', () => {
  it("loads the Variant's current Option Type/Value combination", async () => {
    testContext.listVariantOptionValues.mockResolvedValue([
      {
        optionTypeId: 'type-flavor',
        optionTypeName: 'Flavor',
        optionValueId: 'value-berry',
        optionValueName: 'Berry',
      },
    ]);

    const { result } = renderHook(() => useVariantOptionValues('variant-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.selections).toEqual([
      {
        optionTypeId: 'type-flavor',
        optionTypeName: 'Flavor',
        optionValueId: 'value-berry',
        optionValueName: 'Berry',
      },
    ]);
  });

  it('blocks staged mutations until the existing combination is hydrated', async () => {
    let resolveRead: ((value: []) => void) | undefined;
    testContext.listVariantOptionValues.mockImplementation(
      () =>
        new Promise<[]>((resolve) => {
          resolveRead = resolve;
        }),
    );
    const { result } = renderHook(() => useVariantOptionValues('variant-1'));

    act(() => {
      result.current.addSelection({
        optionTypeId: 'type-flavor',
        optionTypeName: 'Flavor',
        optionValueId: 'value-berry',
        optionValueName: 'Berry',
      });
    });

    expect(result.current.selections).toEqual([]);
    expect(result.current.formError).toMatch(/still loading/i);
    resolveRead?.([]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('rejects adding a second Value for an Option Type already staged', async () => {
    testContext.listVariantOptionValues.mockResolvedValue([]);
    const { result } = renderHook(() => useVariantOptionValues('variant-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addSelection({
        optionTypeId: 'type-flavor',
        optionTypeName: 'Flavor',
        optionValueId: 'value-berry',
        optionValueName: 'Berry',
      });
    });
    expect(result.current.selections).toHaveLength(1);

    act(() => {
      result.current.addSelection({
        optionTypeId: 'type-flavor',
        optionTypeName: 'Flavor',
        optionValueId: 'value-cherry',
        optionValueName: 'Cherry',
      });
    });

    expect(result.current.selections).toHaveLength(1);
    expect(result.current.formError).toMatch(/one Value per Option Type/i);
  });

  it('removes a staged selection', async () => {
    testContext.listVariantOptionValues.mockResolvedValue([
      {
        optionTypeId: 'type-flavor',
        optionTypeName: 'Flavor',
        optionValueId: 'value-berry',
        optionValueName: 'Berry',
      },
    ]);
    const { result } = renderHook(() => useVariantOptionValues('variant-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.removeSelection('type-flavor');
    });

    expect(result.current.selections).toEqual([]);
  });

  it('submits the staged combination via replaceVariantOptionValues', async () => {
    testContext.listVariantOptionValues.mockResolvedValue([]);
    testContext.replaceVariantOptionValues.mockResolvedValue(undefined);
    const { result } = renderHook(() => useVariantOptionValues('variant-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addSelection({
        optionTypeId: 'type-flavor',
        optionTypeName: 'Flavor',
        optionValueId: 'value-berry',
        optionValueName: 'Berry',
      });
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(testContext.replaceVariantOptionValues).toHaveBeenCalledWith('variant-1', [
      { optionTypeId: 'type-flavor', optionValueId: 'value-berry' },
    ]);
  });

  it('surfaces a submit failure without losing the staged selections', async () => {
    testContext.listVariantOptionValues.mockResolvedValue([]);
    testContext.replaceVariantOptionValues.mockRejectedValue(new Error('constraint violation'));
    const { result } = renderHook(() => useVariantOptionValues('variant-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addSelection({
        optionTypeId: 'type-flavor',
        optionTypeName: 'Flavor',
        optionValueId: 'value-berry',
        optionValueName: 'Berry',
      });
    });

    await act(async () => {
      await expect(result.current.submit()).rejects.toThrow('constraint violation');
    });

    expect(result.current.submitError).toBe('constraint violation');
    expect(result.current.selections).toHaveLength(1);
  });
});
