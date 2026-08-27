import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listAssetsPage: vi.fn(),
}));

vi.mock('../repositories', () => ({
  mediaLibraryRepository: {
    listAssetsPage: testContext.listAssetsPage,
  },
}));

import { useMediaPickerAssets } from './useMediaPickerAssets';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useMediaPickerAssets', () => {
  it('loads a bounded page for the current search rather than every Media Asset', async () => {
    testContext.listAssetsPage.mockResolvedValue({ assets: [], total: 0 });

    const { result } = renderHook(
      () => useMediaPickerAssets({ enabled: true, page: 2, search: 'citrus' }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(testContext.listAssetsPage).toHaveBeenCalledWith({
      page: 2,
      pageSize: 24,
      search: 'citrus',
    });
  });
});
