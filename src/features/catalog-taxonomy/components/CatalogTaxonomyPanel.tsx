'use client';

import { KisokButton, StatusPill } from '@/shared/ui';

import { catalogTaxonomyRepository } from '../repositories';

export function CatalogTaxonomyPanel({ onAction }: { onAction: (message: string) => void }) {
  const catalogRows = catalogTaxonomyRepository.list();

  return (
    <section className="border border-[#292929] bg-[#181818] p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-[#303030] border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[#969694] text-[10px] uppercase tracking-[0.2em]">
            Catalog taxonomy / local workspace
          </p>
          <h1 className="mt-2 font-black text-5xl text-[#f0f0ed] tracking-[-0.08em] sm:text-6xl">
            Catalog control
          </h1>
        </div>
        <KisokButton onClick={() => onAction('Taxonomy draft opened')} variant="outline">
          Add taxonomy node
        </KisokButton>
      </div>
      <div className="mt-6 grid gap-px border border-[#303030] bg-[#303030] md:grid-cols-3">
        {catalogRows.map((row) => (
          <article className="bg-[#181818] p-5" key={row.name}>
            <p className="font-mono text-[#898987] text-[10px] uppercase tracking-[0.16em]">
              {row.type}
            </p>
            <h2 className="mt-7 font-black text-3xl text-[#ededeb] tracking-[-0.06em]">
              {row.name}
            </h2>
            <div className="mt-6 flex items-center justify-between border-[#303030] border-t pt-3">
              <span className="text-[#999996] text-xs">{row.children} linked nodes</span>
              <StatusPill>{row.visibility}</StatusPill>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
