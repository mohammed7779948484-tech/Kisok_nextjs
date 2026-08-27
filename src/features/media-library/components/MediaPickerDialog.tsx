'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { CameraIcon, ImagePlusIcon, SearchIcon, UploadIcon } from 'lucide-react';

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

type MediaPickerDialogProps = {
  /** An explicit list is useful for small, preloaded contexts and focused tests. Omit it to use server pages. */
  assets?: MediaAssetRecord[];
  error?: string | null;
  isLoading?: boolean;
  isUploading?: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry?: () => void;
  onSelect: (asset: MediaAssetRecord) => void;
  onUpload?: (file: File) => Promise<MediaAssetRecord | null | undefined>;
  open: boolean;
  selectedAssetId: string | null;
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
  error: suppliedError = null,
  isLoading: suppliedLoading = false,
  isUploading = false,
  onOpenChange,
  onRetry,
  onSelect,
  onUpload,
  open,
  selectedAssetId,
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

  async function handleFileChange(file: File) {
    setValidationError(null);
    const validation = await validateMediaUploadFile(file);
    if (!validation.valid) {
      setValidationError(validation.message);
      return;
    }
    const uploaded = await onUpload?.(file);
    if (!uploaded) return;
    setUploadedAssets((current) => [
      uploaded,
      ...current.filter((asset) => asset.id !== uploaded.id),
    ]);
    setPendingAssetId(uploaded.id);
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

  return (
    <KisokDialog onOpenChange={handleDialogOpenChange} open={open}>
      <KisokDialogContent className="max-w-4xl">
        <KisokDialogHeader>
          <KisokDialogTitle>Media Library</KisokDialogTitle>
          <KisokDialogDescription>
            Choose an existing image, upload a new image, or capture a photo for this Product
            context.
          </KisokDialogDescription>
        </KisokDialogHeader>

        <div className="flex flex-col justify-between gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <KisokInput
              aria-label="Search Media Library"
              className="pl-9"
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search images"
              value={search}
            />
          </div>
          {onUpload ? (
            <div className="flex flex-wrap gap-2">
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
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                type="button"
                variant="outline"
              >
                <UploadIcon /> {isUploading ? 'Uploading…' : 'Upload image'}
              </KisokButton>
              <KisokButton
                disabled={isUploading || camera.status === 'requesting'}
                onClick={() => void retakePhoto()}
                type="button"
                variant="outline"
              >
                <CameraIcon /> {camera.status === 'requesting' ? 'Starting camera…' : 'Take photo'}
              </KisokButton>
            </div>
          ) : null}
        </div>

        {camera.status === 'ready' ? (
          <div className="grid gap-3 border border-border p-3">
            <canvas className="hidden" ref={captureCanvasRef} />
            <video
              aria-label="Camera preview"
              autoPlay
              className="max-h-80 w-full bg-muted object-contain"
              muted
              playsInline
              ref={videoRef}
            />
            <div className="flex flex-wrap gap-2">
              <KisokButton onClick={() => void capturePhoto()} type="button">
                Capture photo
              </KisokButton>
              <KisokButton onClick={camera.stop} type="button" variant="quiet">
                Cancel camera
              </KisokButton>
            </div>
          </div>
        ) : null}
        {capturedPhoto && capturedPhotoUrl ? (
          <div className="grid gap-3 border border-border p-3 sm:grid-cols-[12rem_1fr] sm:items-center">
            <img
              alt="Captured Product"
              className="aspect-square w-full object-cover"
              src={capturedPhotoUrl}
            />
            <div className="grid gap-3">
              <div>
                <h3 className="font-bold">Use this photo?</h3>
                <p className="mt-1 text-muted-foreground text-sm">
                  Retake the photo or confirm it to validate and upload it to the Media Library.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <KisokButton onClick={() => void retakePhoto()} type="button" variant="outline">
                  Retake photo
                </KisokButton>
                <KisokButton
                  disabled={isUploading}
                  onClick={() => {
                    void handleFileChange(capturedPhoto).then(() => setCapturedPhoto(null));
                  }}
                  type="button"
                >
                  Use photo
                </KisokButton>
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="grid gap-3" role="alert">
            <p className="text-destructive text-sm">{error}</p>
            <KisokButton
              className="w-fit"
              onClick={() => {
                onRetry?.();
                if (!isSupplied) void pageData.refetch();
              }}
              type="button"
              variant="outline"
            >
              Retry loading Media
            </KisokButton>
          </div>
        ) : null}
        {isLoading ? (
          <p className="text-muted-foreground text-sm" role="status">
            Loading Media Library…
          </p>
        ) : visibleAssets.length === 0 ? (
          <div className="grid place-items-center gap-3 border border-dashed border-border p-10 text-center">
            <ImagePlusIcon aria-hidden="true" className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              {allAssets.length === 0
                ? 'No images are available yet.'
                : 'No images match this search.'}
            </p>
          </div>
        ) : (
          <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3 lg:grid-cols-4">
            {visibleAssets.map((asset) => {
              const selected = asset.id === pendingAssetId;
              return (
                <KisokButton
                  aria-pressed={selected}
                  aria-label={`Select ${asset.publicId}`}
                  className={
                    selected
                      ? 'h-auto border-primary bg-primary/10 p-2 text-left'
                      : 'h-auto border-border p-2 text-left'
                  }
                  key={asset.id}
                  onClick={() => setPendingAssetId(asset.id)}
                  type="button"
                  variant="outline"
                >
                  <span className="flex aspect-square w-full overflow-hidden bg-muted">
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      height={asset.height ?? undefined}
                      src={asset.secureUrl}
                      width={asset.width ?? undefined}
                    />
                  </span>
                  <span className="mt-2 block w-full truncate font-mono text-xs">
                    {asset.publicId}
                  </span>
                </KisokButton>
              );
            })}
          </div>
        )}
        {!(isSupplied || isLoading || error) ? (
          <div className="flex items-center justify-between gap-3 text-muted-foreground text-sm">
            <span>
              Page {page} of {pageCount} · {pageData.total} assets
            </span>
            <div className="flex gap-2">
              <KisokButton
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                size="sm"
                type="button"
                variant="quiet"
              >
                Previous
              </KisokButton>
              <KisokButton
                disabled={page >= pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                size="sm"
                type="button"
                variant="quiet"
              >
                Next
              </KisokButton>
            </div>
          </div>
        ) : null}

        <KisokDialogFooter>
          <KisokButton onClick={() => handleDialogOpenChange(false)} type="button" variant="quiet">
            Cancel
          </KisokButton>
          <KisokButton
            disabled={selectedAsset === null || isLoading || isUploading}
            onClick={() => {
              if (!selectedAsset) return;
              onSelect(selectedAsset);
              handleDialogOpenChange(false);
            }}
            type="button"
          >
            Use selected image
          </KisokButton>
        </KisokDialogFooter>
      </KisokDialogContent>
    </KisokDialog>
  );
}
