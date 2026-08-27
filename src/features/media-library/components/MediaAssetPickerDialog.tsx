'use client';

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
  KisokInput,
  StatusPill,
} from '@/shared/ui';

import { useMediaUpload } from '../hooks/useMediaUpload';
import { mediaLibraryRepository } from '../repositories';
import type { MediaAssetRecord } from '../types';

export interface MediaAssetPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (asset: MediaAssetRecord) => void;
  selectedAssetId?: string | null;
  title?: string;
  description?: string;
}

export function MediaAssetPickerDialog({
  open,
  onOpenChange,
  onSelect,
  selectedAssetId,
  title = 'Select Media Asset',
  description = 'Choose a media asset from the library or upload a new one.',
}: MediaAssetPickerDialogProps) {
  const [assets, setAssets] = useState<MediaAssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error: uploadError } = useMediaUpload();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAssets(await mediaLibraryRepository.listAssets());
    } catch {
      setError('Media assets could not be loaded. Check connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSearch('');
      void refresh();
    }
  }, [open, refresh]);

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const uploaded = await upload(file);
    if (uploaded) {
      await refresh();
    }
  }

  function handleSelect(asset: MediaAssetRecord) {
    onSelect(asset);
    onOpenChange(false);
  }

  const filteredAssets = assets.filter((asset) =>
    asset.publicId.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <KisokDialog onOpenChange={onOpenChange} open={open}>
      <KisokDialogContent className="max-w-4xl">
        <KisokDialogHeader>
          <KisokDialogTitle>{title}</KisokDialogTitle>
          <KisokDialogDescription>{description}</KisokDialogDescription>
        </KisokDialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <KisokInput
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search media assets…"
                value={search}
              />
            </div>
            <div>
              <input
                accept="image/*"
                aria-label="Upload media asset"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => void handleFileSelected(e)}
                ref={fileInputRef}
                type="file"
              />
              <KisokButton
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                {uploading ? 'Uploading…' : 'Upload new'}
              </KisokButton>
            </div>
          </div>

          {(error || uploadError) && (
            <p className="text-destructive text-sm" role="alert">
              {error ?? uploadError}
            </p>
          )}

          {loading ? (
            <div className="flex min-h-60 items-center justify-center">
              <p className="text-muted-foreground text-sm" role="status">
                Loading media assets…
              </p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-muted-foreground text-sm">
                {search.trim()
                  ? 'No media assets match your search.'
                  : 'No media assets available. Upload one to get started.'}
              </p>
            </div>
          ) : (
            <div className="grid max-h-96 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
              {filteredAssets.map((asset) => {
                const isCurrent = asset.id === selectedAssetId;
                return (
                  <article
                    className={`group relative flex flex-col justify-between border p-2.5 transition-colors ${
                      isCurrent
                        ? 'border-primary ring-2 ring-primary/40 bg-accent/40'
                        : 'border-border bg-card hover:border-border/80 hover:bg-muted/40'
                    }`}
                    key={asset.id}
                  >
                    <div className="flex aspect-square items-center justify-center overflow-hidden rounded bg-muted">
                      <img
                        alt={asset.publicId}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        height={asset.height ?? undefined}
                        src={asset.secureUrl}
                        width={asset.width ?? undefined}
                      />
                    </div>
                    <div className="mt-2.5">
                      <p
                        className="truncate font-mono text-[11px] font-medium"
                        title={asset.publicId}
                      >
                        {asset.publicId}
                      </p>
                      <p className="mt-0.5 text-muted-foreground text-[10px]">
                        {asset.format ?? 'image'} · {asset.width ?? '?'}×{asset.height ?? '?'}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-1.5 border-border border-t pt-2">
                      {isCurrent ? (
                        <StatusPill className="text-[10px]">Selected</StatusPill>
                      ) : (
                        <span />
                      )}
                      <KisokButton
                        aria-label={`Select ${asset.publicId}`}
                        onClick={() => handleSelect(asset)}
                        size="sm"
                        variant={isCurrent ? 'quiet' : 'outline'}
                      >
                        Select
                      </KisokButton>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <KisokDialogFooter>
          <KisokButton onClick={() => onOpenChange(false)} variant="quiet">
            Cancel
          </KisokButton>
        </KisokDialogFooter>
      </KisokDialogContent>
    </KisokDialog>
  );
}
