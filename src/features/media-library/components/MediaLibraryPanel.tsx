'use client';

import { KisokButton } from '@/components/kisok-ui';

const mediaAssets = [
  { label: 'origin-dark.png', role: 'Brand mark' },
  { label: 'arabic-reserve.jpg', role: 'Product cover' },
  { label: 'matcha-detail.jpg', role: 'Flavor image' },
];

export function MediaLibraryPanel({ onAction }: { onAction: (message: string) => void }) {
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
          </article>
        ))}
      </div>
    </section>
  );
}
