'use client';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { MediaPickerDialog } from '@/features/media-library/components/MediaPickerDialog';
import { useMediaUpload } from '@/features/media-library/hooks/useMediaUpload';
import { mediaLibraryRepository } from '@/features/media-library/repositories';
import type { MediaAssetRecord } from '@/features/media-library/types';
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

import { storeSettingsRepository } from '../repositories';
import {
  type StoreSettingsFormValues,
  type StoreSettingsValues,
  storeSettingsFormDefaultValues,
  storeSettingsSchema,
} from '../schemas/store-settings.schema';
import type { StoreSettingsRecord } from '../types';

const SETTINGS_QUERY_KEY = ['store-settings'];

function toFormValues(record: StoreSettingsRecord): StoreSettingsFormValues {
  return {
    store_name: record.storeName,
    global_low_stock_threshold: String(record.globalLowStockThreshold),
    customer_success_reset_seconds: String(record.customerSuccessResetSeconds),
    store_timezone: record.storeTimezone,
    logo_media_asset_id: record.logoMediaAssetId,
  };
}

function LogoPreview({ assetId }: { assetId: string | null }) {
  const { data: asset } = useQuery({
    queryKey: ['store-settings', 'logo-asset', assetId],
    queryFn: () => mediaLibraryRepository.getAsset(assetId as string),
    enabled: Boolean(assetId),
  });

  if (!assetId) {
    return <span className="font-mono text-[10px] uppercase text-muted-foreground">No logo</span>;
  }
  if (!asset) return null;
  return (
    <img alt="Store logo preview" className="h-full w-full object-cover" src={asset.secureUrl} />
  );
}

export function StoreSettingsPanel() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { upload, uploading } = useMediaUpload();

  const settingsQuery = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => storeSettingsRepository.get(),
  });

  const updateMutation = useMutation({
    mutationFn: (values: StoreSettingsValues) =>
      storeSettingsRepository.update({
        storeName: values.store_name,
        globalLowStockThreshold: values.global_low_stock_threshold,
        customerSuccessResetSeconds: values.customer_success_reset_seconds,
        storeTimezone: values.store_timezone,
        logoMediaAssetId: values.logo_media_asset_id,
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, next);
      setEditOpen(false);
    },
  });

  const {
    handleSubmit,
    register,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StoreSettingsFormValues, undefined, StoreSettingsValues>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: storeSettingsFormDefaultValues,
  });

  const logoMediaAssetId = watch('logo_media_asset_id');

  useEffect(() => {
    if (editOpen && settingsQuery.data) {
      reset(toFormValues(settingsQuery.data));
    }
  }, [editOpen, settingsQuery.data, reset]);

  async function onSubmit(values: StoreSettingsValues) {
    await updateMutation.mutateAsync(values);
  }

  const settings = settingsQuery.data ?? null;

  return (
    <section className="grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
      <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-panel sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
              Store settings / hosted data
            </p>
            <h1 className="mt-2 text-balance font-black text-4xl tracking-[-0.05em] sm:text-5xl">
              Store defaults
            </h1>
          </div>
          <KisokButton disabled={!settings} onClick={() => setEditOpen(true)} variant="outline">
            Edit settings
          </KisokButton>
        </div>

        {settingsQuery.isLoading ? (
          <p className="mt-8 text-muted-foreground text-sm" role="status">
            Loading Store Settings…
          </p>
        ) : settingsQuery.isError ? (
          <div className="mt-8 grid gap-3" role="alert">
            <p className="text-destructive text-sm">
              Store Settings could not be loaded. Check the connection and try again.
            </p>
            <KisokButton onClick={() => void settingsQuery.refetch()} variant="outline">
              Try again
            </KisokButton>
          </div>
        ) : settings ? (
          <div className="mt-8 divide-y divide-border border-border border-y">
            {(
              [
                ['Store identity', settings.storeName],
                ['Timezone', settings.storeTimezone],
                ['Low-stock threshold', settings.globalLowStockThreshold],
                ['Customer success reset', settings.customerSuccessResetSeconds],
              ] as const
            ).map(([label, value]) => (
              <div
                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                key={label}
              >
                <span className="text-muted-foreground text-sm">{label}</span>
                <span className="font-mono text-xs uppercase tracking-[0.12em]">{value}</span>
              </div>
            ))}
            <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground text-sm">Logo</span>
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted">
                <LogoPreview assetId={settings.logoMediaAssetId} />
              </div>
            </div>
          </div>
        ) : null}
        {updateMutation.isError ? (
          <p className="mt-4 text-destructive text-sm" role="alert">
            Store Settings could not be saved.
          </p>
        ) : null}
      </div>

      <div className="flex min-h-72 flex-col justify-between overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-panel sm:p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em]">Operational data</p>
        <div>
          <p className="font-black text-4xl tracking-[-0.07em]">Store settings</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-primary-foreground/75">
            Access is verified when you refresh Store Settings or complete a saved change; this
            panel does not claim an independent connection health check.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <StatusPill
              className="border-primary-foreground/30 text-primary-foreground"
              tone="info"
            >
              Supabase-backed
            </StatusPill>
          </div>
        </div>
      </div>

      <KisokDialog onOpenChange={setEditOpen} open={editOpen}>
        <KisokDialogContent>
          <KisokDialogHeader>
            <KisokDialogTitle>Edit Store Settings</KisokDialogTitle>
            <KisokDialogDescription>
              Changes persist to the Lean V2 store settings singleton.
            </KisokDialogDescription>
          </KisokDialogHeader>
          <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
            <label className="grid gap-2" htmlFor="store-identity">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Store name
              </span>
              <KisokInput
                aria-invalid={Boolean(errors.store_name)}
                id="store-identity"
                {...register('store_name')}
              />
              {errors.store_name ? (
                <p className="text-destructive text-sm">{errors.store_name.message}</p>
              ) : null}
            </label>
            <label className="grid gap-2" htmlFor="low-stock-threshold">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Low-stock threshold
              </span>
              <KisokInput
                aria-invalid={Boolean(errors.global_low_stock_threshold)}
                id="low-stock-threshold"
                inputMode="numeric"
                {...register('global_low_stock_threshold')}
              />
              {errors.global_low_stock_threshold ? (
                <p className="text-destructive text-sm">
                  {errors.global_low_stock_threshold.message}
                </p>
              ) : null}
            </label>
            <label className="grid gap-2" htmlFor="order-reset">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Customer success reset seconds
              </span>
              <KisokInput
                aria-invalid={Boolean(errors.customer_success_reset_seconds)}
                id="order-reset"
                inputMode="numeric"
                {...register('customer_success_reset_seconds')}
              />
              {errors.customer_success_reset_seconds ? (
                <p className="text-destructive text-sm">
                  {errors.customer_success_reset_seconds.message}
                </p>
              ) : null}
            </label>
            <div className="grid gap-2">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Logo
              </span>
              <div className="flex items-center gap-3">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted">
                  <LogoPreview assetId={logoMediaAssetId} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <KisokButton
                    onClick={() => setPickerOpen(true)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {logoMediaAssetId ? 'Change logo' : 'Choose from library'}
                  </KisokButton>
                  {logoMediaAssetId ? (
                    <KisokButton
                      onClick={() => setValue('logo_media_asset_id', null, { shouldDirty: true })}
                      size="sm"
                      type="button"
                      variant="quiet"
                    >
                      Remove logo
                    </KisokButton>
                  ) : null}
                </div>
              </div>
            </div>
            <label className="grid gap-2" htmlFor="store-timezone">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Timezone
              </span>
              <KisokInput
                aria-invalid={Boolean(errors.store_timezone)}
                id="store-timezone"
                {...register('store_timezone')}
              />
              {errors.store_timezone ? (
                <p className="text-destructive text-sm">{errors.store_timezone.message}</p>
              ) : null}
            </label>
            {updateMutation.isError ? (
              <p className="text-destructive text-sm" role="alert">
                Store Settings could not be saved.
              </p>
            ) : null}
            <KisokDialogFooter>
              <KisokButton
                disabled={isSubmitting}
                onClick={() => setEditOpen(false)}
                type="button"
                variant="quiet"
              >
                Cancel
              </KisokButton>
              <KisokButton disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Saving…' : 'Save settings'}
              </KisokButton>
            </KisokDialogFooter>
          </form>
        </KisokDialogContent>
      </KisokDialog>

      <MediaPickerDialog
        description="Choose an existing image or upload a new one for the store logo."
        isUploading={uploading}
        onOpenChange={setPickerOpen}
        onSelect={(asset: MediaAssetRecord) =>
          setValue('logo_media_asset_id', asset.id, { shouldDirty: true })
        }
        onUpload={upload}
        open={pickerOpen}
        selectedAssetId={logoMediaAssetId}
        title="Select Store Logo"
      />
    </section>
  );
}
