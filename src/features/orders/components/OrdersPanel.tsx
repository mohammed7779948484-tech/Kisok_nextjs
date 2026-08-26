'use client';

import { StatusPill } from '@/components/admin/StatusPill';

const orderRows = [
  { id: '#K-1048', status: 'Preparing', total: '58.5 SAR', type: 'Customer pickup' },
  { id: '#K-1049', status: 'Completed', total: '42.0 SAR', type: 'Walk-in' },
  { id: '#K-1050', status: 'New', total: '35.0 SAR', type: 'Customer pickup' },
];

export function OrdersPanel() {
  return (
    <section className="border border-[#292929] bg-[#181818] p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-[#303030] border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[#969694] text-[10px] uppercase tracking-[0.2em]">
            Fulfillment queue / local workspace
          </p>
          <h1 className="mt-2 font-black text-5xl text-[#f0f0ed] tracking-[-0.08em] sm:text-6xl">
            Order queue
          </h1>
        </div>
        <StatusPill>Refresh simulated</StatusPill>
      </div>
      <div className="mt-6 grid gap-px border border-[#303030] bg-[#303030] md:grid-cols-3">
        {orderRows.map((order) => (
          <article className="bg-[#181818] p-5" key={order.id}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[#9a9a97] text-xs">{order.id}</p>
              <StatusPill>{order.status}</StatusPill>
            </div>
            <p className="mt-10 font-black text-4xl text-[#eeeeeb] tracking-[-0.07em]">
              {order.total}
            </p>
            <p className="mt-2 text-[#a0a09d] text-sm">{order.type}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
