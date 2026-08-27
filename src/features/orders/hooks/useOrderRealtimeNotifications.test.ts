import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as soundModule from '../lib/sound';
import { useOrderRealtimeNotifications } from './useOrderRealtimeNotifications';

// Mock Supabase browser client
let mockChannelCallback: (payload: any) => void;
const mockRemoveChannel = vi.fn();
const mockSubscribe = vi.fn();

const mockChannel = {
  on: vi.fn((_event, _filter, callback) => {
    mockChannelCallback = callback;
    return {
      subscribe: mockSubscribe,
    };
  }),
};

const mockSupabase = {
  channel: vi.fn(() => mockChannel),
  removeChannel: mockRemoveChannel,
};

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => mockSupabase,
}));

describe('useOrderRealtimeNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(soundModule, 'playOrderChime').mockReturnValue(true);
  });

  it('subscribes to orders postgres_changes on mount and unbinds on unmount', () => {
    const { unmount } = renderHook(() => useOrderRealtimeNotifications({ soundEnabled: true }));

    expect(mockSupabase.channel).toHaveBeenCalledWith('orders-realtime-channel');
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'INSERT', schema: 'public', table: 'orders' }),
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalled();

    unmount();
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('plays chime and updates state when a new order arrives', () => {
    const onNewOrder = vi.fn();
    const { result } = renderHook(() =>
      useOrderRealtimeNotifications({ soundEnabled: true, onNewOrder }),
    );

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.latestOrder).toBeNull();

    act(() => {
      mockChannelCallback({
        new: {
          id: 'ord-123',
          display_number: 'A-42',
          status: 'new',
          created_at: new Date().toISOString(),
        },
      });
    });

    expect(result.current.unreadCount).toBe(1);
    expect(result.current.latestOrder?.displayNumber).toBe('A-42');
    expect(soundModule.playOrderChime).toHaveBeenCalled();
    expect(onNewOrder).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ord-123', displayNumber: 'A-42' }),
    );
  });

  it('does not play audio when soundEnabled is false', () => {
    renderHook(() => useOrderRealtimeNotifications({ soundEnabled: false }));

    act(() => {
      mockChannelCallback({
        new: {
          id: 'ord-456',
          display_number: 'B-10',
          status: 'new',
          created_at: new Date().toISOString(),
        },
      });
    });

    expect(soundModule.playOrderChime).not.toHaveBeenCalled();
  });

  describe('AudioContext lifecycle', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('constructs only one AudioContext across multiple notifications and closes it on unmount', () => {
      const closeMock = vi.fn();
      const audioContextInstances: unknown[] = [];
      // A constructible `function`, not an arrow — `new AudioContextMock()`
      // requires a real constructor.
      const AudioContextMock = vi.fn(function AudioContextStub(this: {
        state: string;
        close: () => void;
      }) {
        this.state = 'running';
        this.close = closeMock;
        audioContextInstances.push(this);
      });
      vi.stubGlobal('AudioContext', AudioContextMock);

      const { unmount } = renderHook(() => useOrderRealtimeNotifications({ soundEnabled: true }));

      act(() => {
        mockChannelCallback({
          new: {
            id: 'ord-1',
            display_number: 'C-1',
            status: 'new',
            created_at: new Date().toISOString(),
          },
        });
      });
      act(() => {
        mockChannelCallback({
          new: {
            id: 'ord-2',
            display_number: 'C-2',
            status: 'new',
            created_at: new Date().toISOString(),
          },
        });
      });

      expect(AudioContextMock).toHaveBeenCalledTimes(1);
      expect(soundModule.playOrderChime).toHaveBeenCalledTimes(2);
      const firstCallContext = vi.mocked(soundModule.playOrderChime).mock.calls[0]?.[0];
      const secondCallContext = vi.mocked(soundModule.playOrderChime).mock.calls[1]?.[0];
      expect(firstCallContext).toBe(audioContextInstances[0]);
      expect(secondCallContext).toBe(audioContextInstances[0]);

      expect(closeMock).not.toHaveBeenCalled();
      unmount();
      expect(closeMock).toHaveBeenCalledTimes(1);
    });
  });
});
