'use client';

import { useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ImagePlusIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
} from 'lucide-react';

import { KisokButton } from '@/shared/ui';

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 border-border border-b pb-3">
        <div>
          <h3 className="font-bold text-base">Attached Media</h3>
          <p className="text-muted-foreground text-xs">
            {attached.length} image{attached.length !== 1 ? 's' : ''} assigned to this Variant
          </p>
        </div>
        <KisokButton onClick={() => setIsPickerOpen(true)} size="sm" type="button">
          <PlusIcon className="mr-1.5 size-4" /> Add Media
        </KisokButton>
      </div>

      {error || uploadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3" role="alert">
          <p className="text-destructive text-xs sm:text-sm">{error ?? uploadError}</p>
          {attachedQuery.isError ? (
            <KisokButton
              className="mt-2 h-7 text-xs"
              onClick={() => void attachedQuery.refetch()}
              type="button"
              variant="outline"
            >
              Retry loading
            </KisokButton>
          ) : null}
        </div>
      ) : null}

      {attachedQuery.isPending ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {['slot-alpha', 'slot-beta', 'slot-gamma'].map((slotId) => (
            <div
              className="flex flex-col gap-2 rounded-xl border border-border/50 bg-card p-3"
              key={slotId}
            >
              <div className="aspect-square w-full animate-pulse rounded-lg bg-muted" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : attachedQuery.isError ? null : (
        <div>
          {attached.length === 0 ? (
            <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <ImagePlusIcon aria-hidden="true" className="size-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">No images attached yet</p>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  Attach images to show this variant in the customer kiosk.
                </p>
              </div>
              <KisokButton
                className="mt-1"
                onClick={() => setIsPickerOpen(true)}
                size="sm"
                type="button"
                variant="outline"
              >
                <PlusIcon className="mr-1.5 size-4" /> Add First Media
              </KisokButton>
            </div>
          ) : (
            <div className="grid max-h-[50vh] grid-cols-1 gap-3.5 overflow-y-auto p-1 sm:grid-cols-2 md:grid-cols-3">
              {attached.map((item, index) => (
                <article
                  className={`group relative flex flex-col justify-between rounded-xl border p-3 shadow-xs transition-colors ${
                    item.isPrimary
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border/80 bg-card hover:border-primary/30'
                  }`}
                  key={item.mediaAssetId}
                >
                  <div>
                    {/* Thumbnail Container */}
                    <div className="relative aspect-square w-full min-h-[140px] overflow-hidden rounded-lg bg-muted/60">
                      <img
                        alt={item.asset.publicId}
                        className="h-full w-full object-cover"
                        height={item.asset.height ?? undefined}
                        src={item.asset.secureUrl}
                        width={item.asset.width ?? undefined}
                      />
                      {item.isPrimary ? (
                        <span className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded bg-primary px-2 py-0.5 font-mono text-[10px] font-bold text-primary-foreground shadow-sm">
                          <StarIcon className="size-3 fill-current" /> PRIMARY
                        </span>
                      ) : null}
                    </div>
                    {/* Caption */}
                    <p
                      className="mt-2.5 truncate font-mono font-medium text-xs text-foreground"
                      title={item.asset.publicId}
                    >
                      {item.asset.publicId}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3 flex flex-col gap-2 border-border/60 border-t pt-2.5">
                    <div className="flex items-center justify-between gap-1.5">
                      {!item.isPrimary ? (
                        <KisokButton
                          className="h-7 flex-1 text-xs"
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
                      ) : (
                        <span className="text-[11px] font-medium text-muted-foreground">
                          Default cover
                        </span>
                      )}

                      {/* Reorder Buttons */}
                      <div className="flex items-center gap-1">
                        <KisokButton
                          aria-label={`Move ${item.asset.publicId} earlier`}
                          className="size-7 p-0"
                          disabled={mutation.isPending || index === 0}
                          onClick={() => move(item, -1)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <ArrowUpIcon aria-hidden="true" className="size-3.5" />
                        </KisokButton>
                        <KisokButton
                          aria-label={`Move ${item.asset.publicId} later`}
                          className="size-7 p-0"
                          disabled={mutation.isPending || index === attached.length - 1}
                          onClick={() => move(item, 1)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <ArrowDownIcon aria-hidden="true" className="size-3.5" />
                        </KisokButton>
                      </div>
                    </div>

                    <KisokButton
                      aria-label={`Remove from Variant ${item.asset.publicId}`}
                      className="h-7 w-full text-destructive text-xs hover:bg-destructive/10 hover:text-destructive"
                      disabled={mutation.isPending}
                      onClick={() =>
                        run(() =>
                          mediaLibraryRepository.detachVariantMedia(variantId, item.mediaAssetId),
                        )
                      }
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2Icon className="mr-1 size-3.5" /> Remove from Variant
                    </KisokButton>
                  </div>
                </article>
              ))}
            </div>
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
    </div>
  );
}
