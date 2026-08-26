'use client';

import { useState } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { KisokButton, StatusPill } from '@/shared/ui';

import { productCatalogRepository } from '../repositories';

export function ProductCatalogPanel() {
  const [draftOpen, setDraftOpen] = useState(false);
  const products = productCatalogRepository.list();

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
        <Table className="min-w-[680px] text-left">
          <TableHeader className="border-[#383838] font-mono text-[#858583] text-[10px] uppercase tracking-[0.17em]">
            <TableRow>
              <TableHead className="pr-6 pb-3 font-medium">Product</TableHead>
              <TableHead className="pr-6 pb-3 font-medium">Category</TableHead>
              <TableHead className="pr-6 pb-3 font-medium">Available</TableHead>
              <TableHead className="pb-3 text-right font-medium">Signal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#2d2d2d]">
            {products.map((product, index) => (
              <TableRow className="group" key={product.name}>
                <TableCell className="py-5 pr-6">
                  <div className="flex items-center gap-4">
                    <div className={`size-9 ${index === 0 ? 'bg-[#e7e7e4]' : 'bg-[#575757]'}`} />
                    <span className="font-bold text-[#eeeeeb]">{product.name}</span>
                  </div>
                </TableCell>
                <TableCell className="py-5 pr-6 text-[#9e9e9b] text-sm">
                  {product.category}
                </TableCell>
                <TableCell className="py-5 pr-6 font-mono text-[#d6d6d2] text-sm">
                  {String(product.stock).padStart(2, '0')}
                </TableCell>
                <TableCell className="py-5 text-right">
                  <StatusPill>{product.status}</StatusPill>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
