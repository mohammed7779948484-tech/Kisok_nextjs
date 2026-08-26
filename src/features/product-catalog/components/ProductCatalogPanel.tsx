'use client';

import { useState } from 'react';

import { StatusPill } from '@/components/admin/StatusPill';
import { KisokButton } from '@/components/kisok-ui';

const products = [
  { category: 'Coffee / Ground', name: 'Arabic Reserve', stock: 3, status: 'Low stock' },
  { category: 'Tea / Green', name: 'Ceremony Matcha', stock: 7, status: 'Review stock' },
  { category: 'Coffee / Pods', name: 'Midnight Roast', stock: 18, status: 'In stock' },
];

export function ProductCatalogPanel() {
  const [draftOpen, setDraftOpen] = useState(false);

  return (
    <section className="border border-[#292929] bg-[#181818] p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-[#303030] border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[#969694] text-[10px] uppercase tracking-[0.2em]">
            Product catalog / local workspace
          </p>
          <h1 className="mt-2 font-black text-5xl text-[#f0f0ed] tracking-[-0.08em] sm:text-6xl">
            Product catalog
          </h1>
        </div>
        <KisokButton onClick={() => setDraftOpen((open) => !open)} variant="outline">
          New product
        </KisokButton>
      </div>
      {draftOpen ? (
        <div className="mt-6 border border-[#e7e7e4] bg-[#e7e7e4] p-5 text-[#141414]">
          <p className="font-mono text-[#5a5a58] text-[10px] uppercase tracking-[0.18em]">
            Local action buffer
          </p>
          <h2 className="mt-2 font-black text-3xl tracking-[-0.06em]">Draft product buffer</h2>
          <p className="mt-2 max-w-2xl text-[#4d4d4b] text-sm leading-6">
            Use this layout to enter product data in the next iteration. The current action is
            intentionally local and does not write to Supabase.
          </p>
        </div>
      ) : null}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <thead className="border-[#383838] border-b font-mono text-[#858583] text-[10px] uppercase tracking-[0.17em]">
            <tr>
              <th className="pr-6 pb-3 font-medium">Product</th>
              <th className="pr-6 pb-3 font-medium">Category</th>
              <th className="pr-6 pb-3 font-medium">Available</th>
              <th className="pb-3 text-right font-medium">Signal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d2d2d]">
            {products.map((product, index) => (
              <tr className="group" key={product.name}>
                <td className="py-5 pr-6">
                  <div className="flex items-center gap-4">
                    <div className={`size-9 ${index === 0 ? 'bg-[#e7e7e4]' : 'bg-[#575757]'}`} />
                    <span className="font-bold text-[#eeeeeb]">{product.name}</span>
                  </div>
                </td>
                <td className="py-5 pr-6 text-[#9e9e9b] text-sm">{product.category}</td>
                <td className="py-5 pr-6 font-mono text-[#d6d6d2] text-sm">
                  {String(product.stock).padStart(2, '0')}
                </td>
                <td className="py-5 text-right">
                  <StatusPill>{product.status}</StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
