import Link from 'next/link';

import { getServerSupabaseClient } from '@/infrastructure/supabase/client/server-client';
import { getDashboardOperationalSnapshot } from '@/infrastructure/supabase/dashboard-operations/adapter';
import { StatusPill } from '@/shared/ui';

const metrics = [
  ['activeProductCount', 'Active products'],
  ['variantCount', 'Variants'],
  ['unavailableVariantCount', 'Unavailable variants'],
  ['lowStockCount', 'Low-stock variants'],
  ['openOrderCount', 'Open orders'],
  ['brandCount', 'Brands'],
  ['categoryCount', 'Categories'],
  ['mediaAssetCount', 'Media assets'],
] as const;

export async function OperationalDashboard() {
  const result = await getDashboardOperationalSnapshot(await getServerSupabaseClient());

  if (result.status === 'unconfigured') {
    return (
      <DashboardState
        title="Database is not configured"
        body="Set the Supabase URL and publishable key, then verify the connection before using the Admin workspace."
      />
    );
  }

  if (result.status === 'error' || !result.snapshot) {
    return (
      <DashboardState
        title="Operational data is unavailable"
        body="The workspace could not read operational data. Check the database status and try again."
      />
    );
  }

  return (
    <section className="space-y-6 sm:space-y-8">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
            Operations control
          </p>
          <h1 className="mt-2 text-balance font-black text-4xl tracking-[-0.05em] sm:text-5xl">
            Store pulse
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground text-sm leading-6">
            A compact view of catalog health, stock availability, fulfillment, and shared media.
          </p>
        </div>
        <StatusPill tone="success">Operational snapshot</StatusPill>
      </div>

      <div className="grid overflow-hidden rounded-2xl border border-border bg-border shadow-panel sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([key, label]) => (
          <div className="bg-card p-5 transition-colors hover:bg-accent/25" key={key}>
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
              {label}
            </p>
            <p className="mt-3 font-black text-4xl tracking-[-0.05em] tabular-nums">
              {result.snapshot[key]}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-panel sm:p-7">
          <div className="flex items-center justify-between gap-4 border-border border-b pb-4">
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
                Fulfillment
              </p>
              <h2 className="mt-1 font-semibold text-lg">Recent orders</h2>
            </div>
            <Link
              className="text-muted-foreground text-sm underline-offset-4 hover:underline"
              href="/en/admin/orders"
            >
              Open queue
            </Link>
          </div>
          <div className="divide-y divide-border">
            {result.snapshot.recentOrders.length ? (
              result.snapshot.recentOrders.map((order) => (
                <div className="flex items-center justify-between gap-4 py-4" key={order.id}>
                  <span className="font-mono text-sm">#{order.displayNumber}</span>
                  <StatusPill tone="info">{order.status}</StatusPill>
                </div>
              ))
            ) : (
              <p className="py-8 text-muted-foreground text-sm">No operational orders yet.</p>
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-muted/45 p-5 sm:p-7">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
            Next checks
          </p>
          <h2 className="mt-2 font-semibold text-lg">Keep the floor moving</h2>
          <div className="mt-6 space-y-4 text-sm">
            <p className="border-border border-l-2 pl-3">
              Review low-stock variants before the next replenishment run.
            </p>
            <p className="border-border border-l-2 pl-3">
              Keep order status transitions inside the operational queue.
            </p>
            <p className="border-border border-l-2 pl-3">
              Reuse approved media assets instead of duplicating uploads.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}

function DashboardState({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-panel sm:p-8">
      <StatusPill tone="warning">Action required</StatusPill>
      <h1 className="mt-5 text-balance font-black text-4xl tracking-[-0.05em] sm:text-5xl">
        {title}
      </h1>
      <p className="mt-5 max-w-2xl text-muted-foreground text-sm leading-7">{body}</p>
    </section>
  );
}
