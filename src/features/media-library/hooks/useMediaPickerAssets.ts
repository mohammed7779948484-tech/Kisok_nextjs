'use client';

import { useQuery } from '@tanstack/react-query';

import { mediaLibraryRepository } from '../repositories';
import type { MediaAssetRecord } from '../types';

export const MEDIA_PICKER_PAGE_SIZE = 24;

type UseMediaPickerAssetsParams = {
  enabled: boolean;
  page: number;
  search: string;
};

export function useMediaPickerAssets({ enabled, page, search }: UseMediaPickerAssetsParams) {
  const normalizedSearch = search.trim();
  const query = useQuery({
    queryKey: ['media-picker-assets', page, normalizedSearch],
    queryFn: () =>
      mediaLibraryRepository.listAssetsPage({
        page,
        pageSize: MEDIA_PICKER_PAGE_SIZE,
        search: normalizedSearch,
      }),
    enabled,
  });

  const assets: MediaAssetRecord[] = query.data?.assets ?? [];
  return {
    assets,
    error: query.isError
      ? query.error instanceof Error
        ? query.error.message
        : 'Media Assets could not be loaded.'
      : null,
    isLoading: query.isPending,
    page,
    pageCount: Math.max(1, Math.ceil((query.data?.total ?? 0) / MEDIA_PICKER_PAGE_SIZE)),
    refetch: query.refetch,
    status: query.isPending ? 'loading' : query.isError ? 'error' : 'ready',
    total: query.data?.total ?? 0,
  };
}
