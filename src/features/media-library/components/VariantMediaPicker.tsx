'use client';

import { useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';

import { KisokButton, StatusPill } from '@/shared/ui';

import { useMediaUpload } from '../hooks/useMediaUpload';
import { mediaLibraryRepository } from '../repositories';
import type { MediaAssetRecord, VariantMediaRecord } from '../types';
import { MediaPickerDialog } from './MediaPickerDialog';

export interface VariantMediaPickerProps {
  variantId: string;
}

/**
 * Owns only the Variant ↔ Media Asset join. Asset selection and upload live in
 * `MediaPickerDialog`; detach never deletes the shared `media_assets` metadata
 * row or its Cloudinary binary.
 */
export function VariantMediaPicker({ variantId }: VariantMediaPickerProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { upload, uploading, error: uploadError } = useMediaUpload();
  const attachedQuery = useQuery({
    queryKey: ['variant-media', variantId],
    queryFn: () => mediaLibraryRepository.listVariantMedia(variantId),
  });
  const attached = attachedQuery.data ?? [];
  const mutation = useMutation({
    mutationFn: async (operation: () => Promise<void>) => operation(),
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'The Variant Media operation could not be completed.',
      );
    },
    onSuccess: async () => {
      setError(null);
      await attachedQuery.refetch();
    },
  });

  function run(operation: () => Promise<void>) {
    setError(null);
    mutation.mutate(operation);
  }

  function attachAsset(asset: MediaAssetRecord) {
    run(() => mediaLibraryRepository.attachVariantMedia(variantId, asset.id));
    setIsPickerOpen(false);
  }

  function move(item: VariantMediaRecord, direction: -1 | 1) {
    const index = attached.findIndex((entry) => entry.mediaAssetId === item.mediaAssetId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= attached.length) return;
    const reordered = [...attached];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    run(() =>
      mediaLibraryRepository.reorderVariantMedia(
        variantId,
        reordered.map((entry) => entry.mediaAssetId),
      ),
    );
  }

  return (
    <section className="border border-border bg-card p-5 text-card-foreground">
      <div className="flex flex-col justify-between gap-3 border-border border-b pb-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
            Variant Media
          </p>
          <h2 className="mt-2 font-black text-2xl tracking-[-0.06em]">Attached images</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Add a reusable Media Asset, upload a new one, choose a primary image, or reorder the
            Variant-specific presentation.
          </p>
        </div>
        <KisokButton onClick={() => setIsPickerOpen(true)} type="button" variant="outline">
          Add Media
        </KisokButton>
      </div>

      {error || uploadError ? (
        <div className="mt-4 grid gap-3" role="alert">
          <p className="text-destructive text-sm">{error ?? uploadError}</p>
          {attachedQuery.isError ? (
            <KisokButton
              onClick={() => void attachedQuery.refetch()}
              type="button"
              variant="outline"
            >
              Retry loading Variant Media
            </KisokButton>
          ) : null}
        </div>
      ) : null}
      {attachedQuery.isPending ? (
        <p className="mt-4 text-muted-foreground text-sm" role="status">
          Loading Variant Media…
        </p>
      ) : attachedQuery.isError ? null : (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {attached.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No Media is attached to this Variant yet.
            </p>
          ) : (
            attached.map((item, index) => (
              <article className="border border-border p-3" key={item.mediaAssetId}>
                <div className="flex aspect-square items-center justify-center overflow-hidden bg-muted">
                  <img
                    alt={item.asset.publicId}
                    className="h-full w-full object-cover"
                    height={item.asset.height ?? undefined}
                    src={item.asset.secureUrl}
                    width={item.asset.width ?? undefined}
                  />
                </div>
                <p className="mt-3 truncate font-mono text-xs">{item.asset.publicId}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  {item.isPrimary ? (
                    <StatusPill>Primary</StatusPill>
                  ) : (
                    <KisokButton
                      disabled={mutation.isPending}
                      onClick={() =>
                        run(() =>
                          mediaLibraryRepository.setPrimaryVariantMedia(
                            variantId,
                            item.mediaAssetId,
                          ),
                        )
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Make primary
                    </KisokButton>
                  )}
                  <div className="flex gap-1">
                    <KisokButton
                      aria-label={`Move ${item.asset.publicId} earlier`}
                      disabled={mutation.isPending || index === 0}
                      onClick={() => move(item, -1)}
                      size="sm"
                      type="button"
                      variant="quiet"
                    >
                      ↑
                    </KisokButton>
                    <KisokButton
                      aria-label={`Move ${item.asset.publicId} later`}
                      disabled={mutation.isPending || index === attached.length - 1}
                      onClick={() => move(item, 1)}
                      size="sm"
                      type="button"
                      variant="quiet"
                    >
                      ↓
                    </KisokButton>
                  </div>
                </div>
                <KisokButton
                  aria-label={`Remove from Variant ${item.asset.publicId}`}
                  className="mt-2 w-full"
                  disabled={mutation.isPending}
                  onClick={() =>
                    run(() =>
                      mediaLibraryRepository.detachVariantMedia(variantId, item.mediaAssetId),
                    )
                  }
                  size="sm"
                  type="button"
                  variant="quiet"
                >
                  Remove from Variant
                </KisokButton>
              </article>
            ))
          )}
        </div>
      )}

      <MediaPickerDialog
        isUploading={uploading}
        onOpenChange={setIsPickerOpen}
        onSelect={attachAsset}
        onUpload={upload}
        open={isPickerOpen}
        selectedAssetId={null}
      />
    </section>
  );
}
