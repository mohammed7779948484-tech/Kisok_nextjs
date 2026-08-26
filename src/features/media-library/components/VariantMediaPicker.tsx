'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { KisokButton, StatusPill } from '@/shared/ui';

import { useMediaUpload } from '../hooks/useMediaUpload';
import { mediaLibraryRepository } from '../repositories';
import type { MediaAssetRecord, VariantMediaRecord } from '../types';

export interface VariantMediaPickerProps {
  variantId: string;
}

/**
 * Self-contained Variant ↔ Media Asset relationship editor. Meant to be
 * mounted inside the Product Catalog Variant editor (owned by a parallel
 * effort in `src/features/product-catalog/`) once that UI is ready — this
 * component owns only the `product_variant_media` join.
 *
 * "Remove from Variant" always calls `detachVariantMedia`, which deletes
 * ONLY the join row. It never calls `deleteMediaAsset` (the usage-guarded
 * Cloudinary + `media_assets` delete in `server/actions.ts`) — those two
 * operations must never be conflated, so there is intentionally no "Delete"
 * action anywhere in this component.
 *
 * Fallback note: if a Variant has no attached Media, the Product's own
 * cover media (`products.cover_media_asset_id`, see
 * `product-catalog/repositories/supabase.ts`) would be the natural display
 * fallback. Neither `ProductCatalogPanel` nor the order-item snapshot path
 * currently implement such a fallback lookup, so it is not implemented here
 * either — documenting it as a follow-up rather than inventing fallback
 * behavior nothing else in the codebase currently relies on.
 */
export function VariantMediaPicker({ variantId }: VariantMediaPickerProps) {
  const [attached, setAttached] = useState<VariantMediaRecord[]>([]);
  const [library, setLibrary] = useState<MediaAssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error: uploadError } = useMediaUpload();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [variantMedia, assets] = await Promise.all([
        mediaLibraryRepository.listVariantMedia(variantId),
        mediaLibraryRepository.listAssets(),
      ]);
      setAttached(variantMedia);
      setLibrary(assets);
    } catch {
      setError('Variant Media could not be loaded. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [variantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const attachedIds = new Set(attached.map((item) => item.mediaAssetId));
  const availableAssets = library.filter((asset) => !attachedIds.has(asset.id));

  async function attach(mediaAssetId: string) {
    setBusyId(mediaAssetId);
    setError(null);
    try {
      await mediaLibraryRepository.attachVariantMedia(variantId, mediaAssetId);
      await refresh();
    } catch {
      setError('The Media Asset could not be attached to this Variant.');
    } finally {
      setBusyId(null);
    }
  }

  async function detach(mediaAssetId: string) {
    setBusyId(mediaAssetId);
    setError(null);
    try {
      // Removes only the Variant ↔ Media Asset relation — see the
      // component doc comment above. Never deletes `media_assets`.
      await mediaLibraryRepository.detachVariantMedia(variantId, mediaAssetId);
      await refresh();
    } catch {
      setError('The Media Asset could not be removed from this Variant.');
    } finally {
      setBusyId(null);
    }
  }

  async function makePrimary(mediaAssetId: string) {
    setBusyId(mediaAssetId);
    setError(null);
    try {
      await mediaLibraryRepository.setPrimaryVariantMedia(variantId, mediaAssetId);
      await refresh();
    } catch {
      setError('This Media Asset could not be marked primary.');
    } finally {
      setBusyId(null);
    }
  }

  async function move(mediaAssetId: string, direction: -1 | 1) {
    const index = attached.findIndex((item) => item.mediaAssetId === mediaAssetId);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= attached.length) return;

    const reordered = [...attached];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setBusyId(mediaAssetId);
    setError(null);
    try {
      await mediaLibraryRepository.reorderVariantMedia(
        variantId,
        reordered.map((item) => item.mediaAssetId),
      );
      await refresh();
    } catch {
      setError('Variant Media could not be reordered.');
    } finally {
      setBusyId(null);
    }
  }

  async function uploadAndAttach(file: File) {
    const uploaded = await upload(file);
    if (uploaded) await attach(uploaded.id);
  }

  return (
    <section className="border border-border bg-card p-5 text-card-foreground">
      <div className="flex flex-col justify-between gap-3 border-border border-b pb-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
            Variant media
          </p>
          <h2 className="mt-2 font-black text-2xl tracking-[-0.06em]">Attached images</h2>
        </div>
        <div className="inline-flex items-center gap-2">
          <input
            accept="image/*"
            aria-label="Upload and attach media"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void uploadAndAttach(file);
            }}
            ref={fileInputRef}
            type="file"
          />
          <KisokButton
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
          >
            {uploading ? 'Uploading…' : 'Upload & attach'}
          </KisokButton>
        </div>
      </div>

      {(error || uploadError) && (
        <p className="mt-4 text-destructive text-sm" role="alert">
          {error ?? uploadError}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-muted-foreground text-sm" role="status">
          Loading Variant Media…
        </p>
      ) : (
        <>
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
                        disabled={busyId === item.mediaAssetId}
                        onClick={() => void makePrimary(item.mediaAssetId)}
                        size="sm"
                        variant="outline"
                      >
                        Make primary
                      </KisokButton>
                    )}
                    <div className="flex gap-1">
                      <KisokButton
                        aria-label={`Move ${item.asset.publicId} earlier`}
                        disabled={busyId === item.mediaAssetId || index === 0}
                        onClick={() => void move(item.mediaAssetId, -1)}
                        size="sm"
                        variant="quiet"
                      >
                        ↑
                      </KisokButton>
                      <KisokButton
                        aria-label={`Move ${item.asset.publicId} later`}
                        disabled={busyId === item.mediaAssetId || index === attached.length - 1}
                        onClick={() => void move(item.mediaAssetId, 1)}
                        size="sm"
                        variant="quiet"
                      >
                        ↓
                      </KisokButton>
                    </div>
                  </div>
                  <KisokButton
                    aria-label={`Remove from Variant ${item.asset.publicId}`}
                    className="mt-2 w-full"
                    disabled={busyId === item.mediaAssetId}
                    onClick={() => void detach(item.mediaAssetId)}
                    size="sm"
                    variant="quiet"
                  >
                    Remove from Variant
                  </KisokButton>
                </article>
              ))
            )}
          </div>

          <div className="mt-6 border-border border-t pt-4">
            <h3 className="font-bold text-sm uppercase tracking-[0.08em]">
              Attach from the Media Library
            </h3>
            {availableAssets.length === 0 ? (
              <p className="mt-3 text-muted-foreground text-sm">
                No unattached Media Assets are available.
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {availableAssets.map((asset) => (
                  <article className="border border-border p-3" key={asset.id}>
                    <div className="flex aspect-square items-center justify-center overflow-hidden bg-muted">
                      <img
                        alt={asset.publicId}
                        className="h-full w-full object-cover"
                        height={asset.height ?? undefined}
                        src={asset.secureUrl}
                        width={asset.width ?? undefined}
                      />
                    </div>
                    <p className="mt-3 truncate font-mono text-xs">{asset.publicId}</p>
                    <KisokButton
                      className="mt-2 w-full"
                      disabled={busyId === asset.id}
                      onClick={() => void attach(asset.id)}
                      size="sm"
                      variant="outline"
                    >
                      Attach to Variant
                    </KisokButton>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
