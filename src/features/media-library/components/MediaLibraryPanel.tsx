'use client';

import { useState } from 'react';

import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
} from '@/shared/ui';

import { mediaLibraryRepository } from '../repositories';
import type { LocalMediaAsset } from '../types';

export function MediaLibraryPanel({ onAction }: { onAction: (message: string) => void }) {
  const [assetForRemoval, setAssetForRemoval] = useState<LocalMediaAsset | null>(null);
  const mediaAssets = mediaLibraryRepository.list();

  function stageRemovalReview() {
    if (assetForRemoval) {
      onAction(`Removal review staged for ${assetForRemoval.label}`);
    }
    setAssetForRemoval(null);
  }

  return (
    <section className="border border-[#292929] bg-[#181818] p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-[#303030] border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[#969694] text-[10px] uppercase tracking-[0.2em]">
            Media library / local workspace
          </p>
          <h1 className="mt-2 font-black text-5xl text-[#f0f0ed] tracking-[-0.08em] sm:text-6xl">
            Asset register
          </h1>
        </div>
        <KisokButton onClick={() => onAction('Asset upload buffer opened')} variant="outline">
          Upload asset
        </KisokButton>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {mediaAssets.map((asset, index) => (
          <article className="border border-[#343434] p-3" key={asset.label}>
            <div
              className={`flex aspect-square items-end p-3 ${index === 0 ? 'bg-[#e7e7e4] text-[#141414]' : 'bg-[#323232] text-[#ededeb]'}`}
            >
              <span className="font-black text-4xl tracking-[-0.08em]">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
            <p className="mt-4 truncate font-mono text-[#e5e5e1] text-xs">{asset.label}</p>
            <p className="mt-1 text-[#979794] text-xs">{asset.role}</p>
            <KisokButton
              aria-label={`Review removal for ${asset.label}`}
              className="mt-4 w-full"
              onClick={() => setAssetForRemoval(asset)}
              size="compact"
              variant="quiet"
            >
              Review removal
            </KisokButton>
          </article>
        ))}
      </div>
      <KisokDialog
        onOpenChange={(open) => {
          if (!open) {
            setAssetForRemoval(null);
          }
        }}
        open={Boolean(assetForRemoval)}
      >
        <KisokDialogContent>
          <KisokDialogHeader>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#969694]">
              Media library / local action
            </p>
            <KisokDialogTitle>Review asset removal</KisokDialogTitle>
            <KisokDialogDescription>
              {assetForRemoval?.label} is still represented as a local asset. A real deletion must
              first verify product references through the Cloudinary integration.
            </KisokDialogDescription>
          </KisokDialogHeader>
          <div className="border-l-2 border-[#e7e7e4] bg-[#222222] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e7e7e4]">
              Usage check required
            </p>
            <p className="mt-2 text-sm leading-6 text-[#b7b7b3]">
              This local review does not delete a file or alter a product record.
            </p>
          </div>
          <KisokDialogFooter>
            <KisokButton onClick={() => setAssetForRemoval(null)} variant="quiet">
              Keep asset
            </KisokButton>
            <KisokButton onClick={stageRemovalReview} variant="destructive">
              Stage removal review
            </KisokButton>
          </KisokDialogFooter>
        </KisokDialogContent>
      </KisokDialog>
    </section>
  );
}
