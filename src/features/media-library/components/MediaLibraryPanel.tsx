'use client';

import { useCallback, useEffect, useState } from 'react';

import { KisokButton, StatusPill } from '@/shared/ui';

import { mediaLibraryRepository } from '../repositories';
import type { MediaAssetRecord } from '../types';

export function MediaLibraryPanel() {
  const [assets, setAssets] = useState<MediaAssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <section className="border border-border bg-card p-5 text-card-foreground sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
            Media library / hosted metadata
          </p>
          <h1 className="mt-2 font-black text-5xl tracking-[-0.08em] sm:text-6xl">
            Asset register
          </h1>
        </div>
        <KisokButton onClick={() => void refresh()} variant="outline">
          Refresh
        </KisokButton>
      </div>

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
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {assets.map((asset) => (
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
              <p className="mt-4 truncate font-mono text-xs">{asset.publicId}</p>
              <p className="mt-1 text-muted-foreground text-xs">
                {asset.format ?? 'unknown'} · {asset.width ?? '?'}×{asset.height ?? '?'}
              </p>
              <StatusPill className="mt-3">Hosted asset</StatusPill>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
