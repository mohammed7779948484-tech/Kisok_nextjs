'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import {
  CameraIcon,
  CheckCircle2Icon,
  CheckIcon,
  ImagePlusIcon,
  RefreshCwIcon,
  SearchIcon,
  UploadCloudIcon,
  XIcon,
} from 'lucide-react';

import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
  KisokInput,
} from '@/shared/ui';

import { validateMediaUploadFile } from '../client/media-upload-validation';
import { useCameraCapture } from '../hooks/useCameraCapture';
import { useMediaPickerAssets } from '../hooks/useMediaPickerAssets';
import type { MediaAssetRecord } from '../types';

export type MediaPickerDialogProps = {
  /** An explicit list is useful for small, preloaded contexts and focused tests. Omit it to use server pages. */
  assets?: MediaAssetRecord[];
  description?: string;
  error?: string | null;
  isLoading?: boolean;
  isUploading?: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry?: () => void;
  onSelect: (asset: MediaAssetRecord) => void;
  onUpload?: (file: File) => Promise<MediaAssetRecord | null | undefined>;
  open: boolean;
  selectedAssetId: string | null;
  title?: string;
};

function captureVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!(video.videoWidth && video.videoHeight)) {
      reject(new Error('The camera preview is not ready. Try again in a moment.'));
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('The photo could not be captured.'));
          return;
        }
        resolve(new File([blob], `kisok-camera-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  });
}

export function MediaPickerDialog({
  assets: suppliedAssets,
  description = 'Choose an existing image, upload a new image, or capture a photo.',
  error: suppliedError = null,
  isLoading: suppliedLoading = false,
  isUploading = false,
  onOpenChange,
  onRetry,
  onSelect,
  onUpload,
  open,
  selectedAssetId,
  title = 'Media Library',
}: MediaPickerDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [pendingAssetId, setPendingAssetId] = useState<string | null>(selectedAssetId);
  const [uploadedAssets, setUploadedAssets] = useState<MediaAssetRecord[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const camera = useCameraCapture();
  const isSupplied = suppliedAssets !== undefined;
  const pageData = useMediaPickerAssets({
    enabled: open && !isSupplied,
    page,
    search: deferredSearch,
  });
  const sourceAssets = suppliedAssets ?? pageData.assets;
  const allAssets = useMemo(
    () => [
      ...uploadedAssets,
      ...sourceAssets.filter((asset) => !uploadedAssets.some((item) => item.id === asset.id)),
    ],
    [sourceAssets, uploadedAssets],
  );
  const visibleAssets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return normalizedSearch
      ? allAssets.filter((asset) => asset.publicId.toLowerCase().includes(normalizedSearch))
      : allAssets;
  }, [allAssets, search]);
  const selectedAsset = allAssets.find((asset) => asset.id === pendingAssetId) ?? null;
  const error =
    validationError ?? camera.error ?? suppliedError ?? (isSupplied ? null : pageData.error);
  const isLoading = suppliedLoading || (!isSupplied && pageData.isLoading);
  const pageCount = isSupplied ? 1 : pageData.pageCount;

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = camera.stream;
  }, [camera.stream]);

  useEffect(() => {
    if (!capturedPhoto) {
      setCapturedPhotoUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(capturedPhoto);
    setCapturedPhotoUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [capturedPhoto]);

  /** Returns whether the upload actually succeeded, so callers (e.g. the
   * camera confirm step) only clear their local state on success and can
   * retry against the same file/photo after a validation or upload failure. */
  async function handleFileChange(file: File): Promise<boolean> {
    setValidationError(null);
    const validation = await validateMediaUploadFile(file);
    if (!validation.valid) {
      setValidationError(validation.message);
      return false;
    }
    const uploaded = await onUpload?.(file);
    if (!uploaded) return false;
    setUploadedAssets((current) => [
      uploaded,
      ...current.filter((asset) => asset.id !== uploaded.id),
    ]);
    setPendingAssetId(uploaded.id);
    return true;
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function capturePhoto() {
    try {
      const file = await captureVideoFrame(
        videoRef.current as HTMLVideoElement,
        captureCanvasRef.current as HTMLCanvasElement,
      );
      setCapturedPhoto(file);
      camera.stop();
    } catch (captureError) {
      setValidationError(
        captureError instanceof Error ? captureError.message : 'The photo could not be captured.',
      );
    }
  }

  async function retakePhoto() {
    setCapturedPhoto(null);
    setValidationError(null);
    await camera.start();
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setPendingAssetId(selectedAssetId);
      setPage(1);
    } else {
      camera.stop();
      setCapturedPhoto(null);
    }
    onOpenChange(nextOpen);
  }

  function confirmSelection(asset: MediaAssetRecord) {
    onSelect(asset);
    handleDialogOpenChange(false);
  }

  return (
    <KisokDialog onOpenChange={handleDialogOpenChange} open={open}>
      <KisokDialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-4 p-5 sm:max-w-4xl sm:p-6">
        <KisokDialogHeader className="border-border border-b pb-3">
          <div className="flex items-center justify-between">
            <div>
              <KisokDialogTitle className="font-black text-2xl tracking-tight">
                {title}
              </KisokDialogTitle>
              <KisokDialogDescription className="mt-1 text-muted-foreground text-xs sm:text-sm">
                {description}
              </KisokDialogDescription>
            </div>
          </div>
        </KisokDialogHeader>

        {/* Search & Actions Bar */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <KisokInput
              aria-label="Search Media Library"
              className="h-9.5 pr-8 pl-9 text-xs sm:text-sm"
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search images by name or public ID…"
              value={search}
            />
            {search ? (
              <button
                aria-label="Clear search"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => handleSearchChange('')}
                type="button"
              >
                <XIcon className="size-3.5" />
              </button>
            ) : null}
          </div>
          {onUpload ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
                aria-label="Upload image"
                className="sr-only"
                disabled={isUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void handleFileChange(file);
                }}
                ref={fileInputRef}
                type="file"
              />
              <KisokButton
                className="h-9.5 gap-1.5 text-xs sm:text-sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                type="button"
                variant="outline"
              >
                <UploadCloudIcon className="size-4 text-primary" />
                <span>{isUploading ? 'Uploading…' : 'Upload image'}</span>
              </KisokButton>
              <KisokButton
                className="h-9.5 gap-1.5 text-xs sm:text-sm"
                disabled={isUploading || camera.status === 'requesting'}
                onClick={() => void retakePhoto()}
                type="button"
                variant="outline"
              >
                <CameraIcon className="size-4 text-muted-foreground" />
                <span>{camera.status === 'requesting' ? 'Starting camera…' : 'Take photo'}</span>
              </KisokButton>
            </div>
          ) : null}
        </div>

        {/* Live Camera Viewfinder */}
        {camera.status === 'ready' ? (
          <div className="grid gap-3 rounded-2xl border border-primary/30 bg-muted/40 p-4">
            <canvas className="hidden" ref={captureCanvasRef} />
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
              <video
                aria-label="Camera preview"
                autoPlay
                className="h-full w-full object-contain"
                muted
                playsInline
                ref={videoRef}
              />
              <div className="pointer-events-none absolute inset-4 rounded-lg border-2 border-primary/40 border-dashed" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <KisokButton onClick={camera.stop} type="button" variant="quiet">
                Cancel camera
              </KisokButton>
              <KisokButton onClick={() => void capturePhoto()} type="button">
                <CameraIcon className="mr-1.5 size-4" /> Capture photo
              </KisokButton>
            </div>
          </div>
        ) : null}

        {/* Captured Photo Preview */}
        {capturedPhoto && capturedPhotoUrl ? (
          <div className="grid gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:grid-cols-[10rem_1fr] sm:items-center">
            <div className="aspect-square w-full overflow-hidden rounded-xl border border-border bg-black shadow-inner">
              <img
                alt="Captured Product"
                className="h-full w-full object-cover"
                src={capturedPhotoUrl}
              />
            </div>
            <div className="grid gap-3">
              <div>
                <h3 className="font-bold text-base">Use this photo?</h3>
                <p className="mt-1 text-muted-foreground text-xs leading-relaxed sm:text-sm">
                  Review the captured snapshot. You can retake it or confirm to upload it directly
                  to your Media Library.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <KisokButton onClick={() => void retakePhoto()} type="button" variant="outline">
                  Retake photo
                </KisokButton>
                <KisokButton
                  disabled={isUploading}
                  onClick={() => {
                    void handleFileChange(capturedPhoto).then((succeeded) => {
                      if (succeeded) setCapturedPhoto(null);
                    });
                  }}
                  type="button"
                >
                  <CheckCircle2Icon className="mr-1.5 size-4" />
                  {isUploading ? 'Uploading…' : 'Use photo'}
                </KisokButton>
              </div>
            </div>
          </div>
        ) : null}

        {/* Error Alert */}
        {error ? (
          <div
            className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive"
            role="alert"
          >
            <p className="text-xs font-medium sm:text-sm">{error}</p>
            <KisokButton
              className="h-7 text-xs"
              onClick={() => {
                onRetry?.();
                if (!isSupplied) void pageData.refetch();
              }}
              type="button"
              variant="outline"
            >
              <RefreshCwIcon className="mr-1 size-3" /> Retry
            </KisokButton>
          </div>
        ) : null}

        {/* Asset Grid / Skeletons / Empty State */}
        {isLoading ? (
          <div className="grid max-h-[55vh] grid-cols-2 gap-3.5 overflow-y-auto p-1 sm:grid-cols-3 md:grid-cols-4">
            {[
              'media-skel-1',
              'media-skel-2',
              'media-skel-3',
              'media-skel-4',
              'media-skel-5',
              'media-skel-6',
              'media-skel-7',
              'media-skel-8',
            ].map((skelId) => (
              <div
                className="flex flex-col gap-2 rounded-xl border border-border/50 bg-card p-2"
                key={skelId}
              >
                <div className="aspect-square min-h-[140px] w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : visibleAssets.length === 0 ? (
          <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ImagePlusIcon aria-hidden="true" className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {allAssets.length === 0
                  ? 'No images available in Media Library'
                  : 'No images match your search'}
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                {allAssets.length === 0
                  ? 'Upload an image above or take a photo to populate your library.'
                  : 'Try searching with a different keyword or clear the search input.'}
              </p>
            </div>
            {onUpload && allAssets.length === 0 ? (
              <KisokButton
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                type="button"
                variant="outline"
              >
                <UploadCloudIcon className="mr-1.5 size-4" /> Upload first image
              </KisokButton>
            ) : null}
          </div>
        ) : (
          <div className="grid max-h-[52vh] grid-cols-2 gap-3.5 overflow-y-auto p-1 sm:grid-cols-3 md:grid-cols-4">
            {visibleAssets.map((asset) => {
              const isSelected = asset.id === pendingAssetId;
              return (
                <button
                  aria-label={`Select ${asset.publicId}`}
                  aria-pressed={isSelected}
                  className={`group relative flex flex-col overflow-hidden rounded-xl border p-2 text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md'
                      : 'border-border/80 bg-card hover:border-primary/50 hover:bg-muted/30 hover:shadow-sm'
                  }`}
                  key={asset.id}
                  onClick={() => setPendingAssetId(asset.id)}
                  onDoubleClick={() => confirmSelection(asset)}
                  type="button"
                >
                  {/* Selected Checkmark Badge */}
                  {isSelected ? (
                    <div className="absolute top-2.5 right-2.5 z-10 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background transition-transform">
                      <CheckIcon className="size-3.5 stroke-[3]" />
                    </div>
                  ) : null}

                  {/* Thumbnail Container */}
                  <div className="relative aspect-square min-h-[130px] w-full overflow-hidden rounded-lg bg-muted/60">
                    <img
                      alt={asset.publicId}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      height={asset.height ?? undefined}
                      loading="lazy"
                      src={asset.secureUrl}
                      width={asset.width ?? undefined}
                    />
                    {/* Dimension / Format Badge */}
                    {asset.format ? (
                      <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-medium text-white/90 uppercase tracking-wider backdrop-blur-xs">
                        {asset.format}
                        {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
                      </span>
                    ) : null}
                  </div>

                  {/* Caption */}
                  <div className="mt-2 w-full">
                    <span
                      className={`block truncate font-mono text-xs transition-colors ${
                        isSelected
                          ? 'font-bold text-primary'
                          : 'text-foreground/90 group-hover:text-foreground'
                      }`}
                      title={asset.publicId}
                    >
                      {asset.publicId}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Asset Confirmation Chip */}
        {selectedAsset ? (
          <div className="flex items-center justify-between rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <CheckCircle2Icon className="size-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">Selected:</span>
              <span className="truncate font-mono font-semibold text-foreground">
                {selectedAsset.publicId}
              </span>
            </div>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              Double-click to apply
            </span>
          </div>
        ) : null}

        {/* Pagination Bar */}
        {!(isSupplied || isLoading || error) && pageCount > 1 ? (
          <div className="flex items-center justify-between gap-3 text-muted-foreground text-xs">
            <span>
              Page {page} of {pageCount} ({pageData.total} items)
            </span>
            <div className="flex items-center gap-1.5">
              <KisokButton
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                size="sm"
                type="button"
                variant="outline"
              >
                Previous
              </KisokButton>
              <KisokButton
                disabled={page >= pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                size="sm"
                type="button"
                variant="outline"
              >
                Next
              </KisokButton>
            </div>
          </div>
        ) : null}

        {/* Dialog Footer */}
        <KisokDialogFooter className="border-border border-t pt-3">
          <KisokButton onClick={() => handleDialogOpenChange(false)} type="button" variant="quiet">
            Cancel
          </KisokButton>
          <KisokButton
            disabled={selectedAsset === null || isLoading || isUploading}
            onClick={() => {
              if (selectedAsset) confirmSelection(selectedAsset);
            }}
            type="button"
          >
            <CheckIcon className="mr-1.5 size-4" />
            Use selected image
          </KisokButton>
        </KisokDialogFooter>
      </KisokDialogContent>
    </KisokDialog>
  );
}
