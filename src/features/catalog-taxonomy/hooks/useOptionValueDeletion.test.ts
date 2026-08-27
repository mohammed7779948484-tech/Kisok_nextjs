import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  deleteOptionValue: vi.fn(),
}));

vi.mock('../repositories', () => ({
  catalogTaxonomyRepository: {
    deleteOptionValue: testContext.deleteOptionValue,
  },
}));

import { useOptionValueDeletion } from './useOptionValueDeletion';

const optionValue = {
  id: 'option-value-1',
  value: 'Berry',
  isActive: true,
  displayOrder: 0,
};

describe('useOptionValueDeletion', () => {
  it('keeps the delete context and returns a professional error when hard deletion fails', async () => {
    testContext.deleteOptionValue.mockRejectedValue(new Error('Network unavailable.'));
    const { result } = renderHook(() => useOptionValueDeletion());

    act(() => result.current.begin(optionValue));
    await act(async () => result.current.confirm());

    expect(result.current.optionValue).toEqual(optionValue);
    expect(result.current.error).toBe('Network unavailable.');
    expect(result.current.inUseBlocked).toBe(false);
  });

  it('clears the confirmation context after a successful hard deletion', async () => {
    const onCompleted = vi.fn();
    testContext.deleteOptionValue.mockResolvedValue({ outcome: 'deleted' });
    const { result } = renderHook(() => useOptionValueDeletion({ onCompleted }));

    act(() => result.current.begin(optionValue));
    await act(async () => result.current.confirm());

    expect(onCompleted).toHaveBeenCalledOnce();
    expect(result.current.optionValue).toBeNull();
    expect(result.current.inUseBlocked).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isWorking).toBe(false);
  });

  it('surfaces the FK-blocked message instead of a generic failure and keeps the context open', async () => {
    const onCompleted = vi.fn();
    testContext.deleteOptionValue.mockResolvedValue({
      outcome: 'in-use',
      message: 'Berry is still used by existing Variants and cannot be deleted.',
    });
    const { result } = renderHook(() => useOptionValueDeletion({ onCompleted }));

    act(() => result.current.begin(optionValue));
    await act(async () => result.current.confirm());

    expect(onCompleted).not.toHaveBeenCalled();
    expect(result.current.optionValue).toEqual(optionValue);
    expect(result.current.inUseBlocked).toBe(true);
    expect(result.current.error).toBe(
      'Berry is still used by existing Variants and cannot be deleted.',
    );
    expect(result.current.isWorking).toBe(false);
  });

  it('cancel clears the pending deletion context', () => {
    const { result } = renderHook(() => useOptionValueDeletion());

    act(() => result.current.begin(optionValue));
    act(() => result.current.cancel());

    expect(result.current.optionValue).toBeNull();
  });
});
