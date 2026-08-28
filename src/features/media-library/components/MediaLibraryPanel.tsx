'use client';

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import { KisokButton, StatusPill } from '@/shared/ui';

import { useMediaUpload } from '../hooks/useMediaUpload';
import { mediaLibraryRepository } from '../repositories';
import { deleteMediaAsset } from '../server/actions';
import type { MediaAssetRecord } from '../types';

export function MediaLibraryPanel() {
  const [assets, setAssets] = useState<MediaAssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error: uploadError } = useMediaUpload();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAssets(await mediaLibraryRepository.listAssets());
    } catch {
      setError('Media Assets could not be loaded. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const uploaded = await upload(file);
    if (uploaded) await refresh();
  }

  async function removeAsset(asset: MediaAssetRecord) {
    setDeletingId(asset.id);
    setError(null);
    try {
      await deleteMediaAsset(asset.id);
      await refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : `The Media Asset ${asset.publicId} could not be deleted.`,
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card/90 p-4 text-card-foreground shadow-panel sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
            Media library / hosted metadata
          </p>
          <h1 className="mt-2 text-balance font-black text-4xl tracking-[-0.05em] sm:text-5xl">
            Asset register
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <input
            aria-label="Upload media"
            accept="image/*"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => void handleFileSelected(event)}
            ref={fileInputRef}
            type="file"
          />
          <KisokButton
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            variant="default"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </KisokButton>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Refresh
          </KisokButton>
        </div>
      </div>

      {uploadError ? (
        <p className="mt-4 text-destructive text-sm" role="alert">
          {uploadError}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-muted-foreground text-sm" role="status">
          Loading Media Assets…
        </p>
      ) : error ? (
        <div className="mt-6 grid gap-3" role="alert">
          <p className="text-destructive text-sm">{error}</p>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Try again
          </KisokButton>
        </div>
      ) : assets.length === 0 ? (
        <p className="mt-6 text-muted-foreground text-sm">No Media Assets are available.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {assets.map((asset) => (
            <article
              className="group rounded-2xl border border-border bg-card p-3 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-panel motion-reduce:transform-none"
              key={asset.id}
            >
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-muted">
                <img
                  alt={asset.publicId}
                  className="h-full w-full object-cover"
                  height={asset.height ?? undefined}
                  src={asset.secureUrl}
                  width={asset.width ?? undefined}
                />
              </div>
              <p className="mt-4 truncate font-mono text-xs">{asset.publicId}</p>
              <p className="mt-1 text-muted-foreground text-xs">
                {asset.format ?? 'unknown'} · {asset.width ?? '?'}×{asset.height ?? '?'}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <StatusPill tone="info">Hosted asset</StatusPill>
                <KisokButton
                  aria-label={`Delete ${asset.publicId}`}
                  disabled={deletingId === asset.id}
                  onClick={() => void removeAsset(asset)}
                  size="sm"
                  variant="destructive"
                >
                  {deletingId === asset.id ? 'Deleting…' : 'Delete'}
                </KisokButton>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
