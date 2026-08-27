import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCameraCapture } from './useCameraCapture';

describe('useCameraCapture', () => {
  it('stops every active MediaStream track when the camera workflow is closed', async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });

    const { result } = renderHook(() => useCameraCapture());

    await result.current.start();
    result.current.stop();

    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' } });
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
