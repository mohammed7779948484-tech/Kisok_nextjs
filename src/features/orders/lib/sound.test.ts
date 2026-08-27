import { beforeEach, describe, expect, it, vi } from 'vitest';

import { playOrderChime } from './sound';

describe('playOrderChime', () => {
  let createdOscillators: any[] = [];
  let createdGains: any[] = [];

  beforeEach(() => {
    createdOscillators = [];
    createdGains = [];
  });

  it('synthesizes a two-tone chime using Web Audio API', () => {
    const mockAudioContext: any = {
      currentTime: 0,
      state: 'running',
      createOscillator: vi.fn(() => {
        const osc = {
          type: 'sine',
          frequency: { setValueAtTime: vi.fn() },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(osc);
        return osc;
      }),
      createGain: vi.fn(() => {
        const gain = {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        };
        createdGains.push(gain);
        return gain;
      }),
      destination: {},
    };

    const played = playOrderChime(mockAudioContext);

    expect(played).toBe(true);
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
    expect(mockAudioContext.createGain).toHaveBeenCalledTimes(1);
    expect(createdOscillators[0].start).toHaveBeenCalled();
    expect(createdOscillators[1].start).toHaveBeenCalled();
  });

  it('gracefully returns false when audio context is unavailable or throws', () => {
    const brokenContext: any = {
      createOscillator: () => {
        throw new Error('Not allowed to start');
      },
    };

    const played = playOrderChime(brokenContext);
    expect(played).toBe(false);
  });
});
