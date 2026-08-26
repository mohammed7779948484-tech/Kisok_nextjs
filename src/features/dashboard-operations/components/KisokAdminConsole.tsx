'use client';

import { useMemo, useState } from 'react';

import { StatusPill } from '@/components/admin/StatusPill';
import { AdminUsersPanel } from '@/features/admin-users/components/AdminUsersPanel';
import { LocalAccessGate } from '@/features/auth-admin-access/components/LocalAccessGate';
import { CatalogTaxonomyPanel } from '@/features/catalog-taxonomy/components/CatalogTaxonomyPanel';
import { InventoryPanel as InventoryFeaturePanel } from '@/features/inventory/components/InventoryPanel';
import { MediaLibraryPanel } from '@/features/media-library/components/MediaLibraryPanel';
import { OrdersPanel as OrdersFeaturePanel } from '@/features/orders/components/OrdersPanel';
import { ProductCatalogPanel } from '@/features/product-catalog/components/ProductCatalogPanel';
import { StoreSettingsPanel } from '@/features/store-settings/components/StoreSettingsPanel';

import { summarizeOperations } from '../lib/dashboard-model';

const navigation = [
  { id: 'dashboard', label: 'Overview', marker: '01' },
  { id: 'products', label: 'Products', marker: '02' },
  { id: 'catalog', label: 'Catalog', marker: '03' },
  { id: 'inventory', label: 'Inventory', marker: '04' },
  { id: 'orders', label: 'Orders', marker: '05' },
  { id: 'users', label: 'Users', marker: '06' },
  { id: 'media', label: 'Media', marker: '07' },
  { id: 'settings', label: 'Settings', marker: '08' },
] as const;

type PanelId = (typeof navigation)[number]['id'];
type LocalViewState = 'empty' | 'failure' | 'loading' | 'ready';

const operationalData = {
  inventory: [
    { available: 3, lowStockAt: 5, sku: 'ARABICA-250' },
    { available: 18, lowStockAt: 5, sku: 'CARDAMOM-60' },
    { available: 7, lowStockAt: 8, sku: 'MATCHA-30' },
  ],
  orders: [
    { amount: 58.5, status: 'preparing' as const },
    { amount: 42, status: 'completed' as const },
    { amount: 35, status: 'new' as const },
  ],
};

const panelCopy: Record<
  Exclude<PanelId, 'dashboard' | 'products'>,
  { eyebrow: string; title: string; body: string }
> = {
  catalog: {
    eyebrow: 'Catalog taxonomy',
    title: 'Brands, categories, and visibility rules',
    body: 'The local interface is ready for hierarchy, order, activation, and impact states. Database rules will attach in the integration phase.',
  },
  inventory: {
    eyebrow: 'Inventory control',
    title: 'Adjust stock with an audit-first workflow',
    body: 'Stock thresholds and adjustment reasons are modeled as local state now, ready to be connected to the existing atomic inventory operations later.',
  },
  orders: {
    eyebrow: 'Fulfillment queue',
    title: 'Open orders stay visible and actionable',
    body: 'The order workspace will preserve completion and cancellation confirmations when the backend contract is connected.',
  },
  users: {
    eyebrow: 'Administration',
    title: 'Roles are a deliberate system boundary',
    body: 'The local surface is prepared for active-admin access, role edits, password resets, and safe account status changes.',
  },
  media: {
    eyebrow: 'Media library',
    title: 'Assets will remain reference-safe',
    body: 'The gallery layout is intentionally separate from uploads so Cloudinary registration and used-asset deletion checks can be added without rewriting the UI.',
  },
  settings: {
    eyebrow: 'Store configuration',
    title: 'Operational defaults in one place',
    body: 'Store identity, timezone, low-stock threshold, and fulfillment defaults will use the same compact configuration pattern.',
  },
};

function OverviewPanel() {
  const summary = summarizeOperations(operationalData);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.24fr_0.76fr]">
      <section className="border border-[#292929] bg-[#181818] p-5 sm:p-7">
        <p className="font-mono text-[#989898] text-[10px] uppercase tracking-[0.22em]">
          Operations control / live local view
        </p>
        <div className="mt-5 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="max-w-xl font-black text-5xl text-[#f1f1ef] leading-[0.84] tracking-[-0.08em] sm:text-7xl">
              Operations control
            </h1>
            <p className="mt-5 max-w-lg text-[#a6a6a2] text-sm leading-6">
              A focused operating surface for the store team. This phase runs on local display data;
              no live store integration is connected.
            </p>
          </div>
          <div className="border-[#f0f0ee] border-l-4 pl-4 font-mono text-[#d6d6d3] text-xs uppercase tracking-[0.14em]">
            Shift A<br />
            09:30 GST
          </div>
        </div>
        <div className="mt-10 grid gap-px overflow-hidden border border-[#303030] bg-[#303030] sm:grid-cols-3">
          <Metric label="Gross sales" value={`${summary.grossSales} SAR`} />
          <Metric label="Open orders" value={String(summary.openOrderCount).padStart(2, '0')} />
          <Metric label="Low stock SKUs" value={String(summary.lowStockCount).padStart(2, '0')} />
        </div>
      </section>

      <section className="relative overflow-hidden border border-[#292929] bg-[#e7e7e4] p-5 text-[#141414] sm:p-7">
        <div className="absolute -top-10 -right-10 size-40 border-[#303030] border-[22px]" />
        <p className="relative font-mono text-[#565656] text-[10px] uppercase tracking-[0.2em]">
          Immediate attention
        </p>
        <div className="relative mt-10 space-y-5">
          <div>
            <p className="font-black text-5xl tracking-[-0.08em]">02</p>
            <p className="mt-1 font-semibold text-sm">Stock signals need review</p>
          </div>
          <div className="border-[#8c8c8a] border-t pt-4 text-[#4d4d4b] text-sm leading-6">
            Arabic Reserve is below its preferred threshold. Move to Inventory to record an
            adjustment once the data connection is enabled.
          </div>
        </div>
      </section>

      <section className="border border-[#292929] bg-[#101010] p-5 sm:p-7 xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-4 border-[#303030] border-b pb-4">
          <div>
            <p className="font-mono text-[#8d8d8b] text-[10px] uppercase tracking-[0.2em]">
              Fulfillment queue
            </p>
            <h2 className="mt-1 font-bold text-lg tracking-[-0.04em]">
              Three orders in the local working set
            </h2>
          </div>
          <StatusPill>Demo mode</StatusPill>
        </div>
        <div className="grid divide-y divide-[#2c2c2c] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            ['#K-1048', 'Preparing', '58.5 SAR'],
            ['#K-1049', 'Completed', '42.0 SAR'],
            ['#K-1050', 'New', '35.0 SAR'],
          ].map(([id, state, amount]) => (
            <div className="py-5 sm:px-5 sm:last:pr-0 sm:first:pl-0" key={id}>
              <p className="font-mono text-[#a2a2a0] text-xs">{id}</p>
              <p className="mt-5 font-black text-2xl tracking-[-0.06em]">{amount}</p>
              <p className="mt-1 text-[#8f8f8c] text-xs uppercase tracking-[0.15em]">{state}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#181818] px-5 py-6">
      <p className="font-mono text-[#8d8d8b] text-[10px] uppercase tracking-[0.17em]">{label}</p>
      <p className="mt-3 font-black text-3xl text-[#f0f0ed] tracking-[-0.06em]">{value}</p>
    </div>
  );
}

export function PlaceholderPanel({
  panel,
}: {
  panel: Exclude<PanelId, 'dashboard' | 'products' | 'catalog' | 'inventory' | 'orders'>;
}) {
  const copy = panelCopy[panel];
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
      <div className="border border-[#292929] bg-[#181818] p-6 sm:p-8">
        <p className="font-mono text-[#969694] text-[10px] uppercase tracking-[0.22em]">
          {copy.eyebrow}
        </p>
        <h1 className="mt-4 max-w-2xl font-black text-5xl text-[#f0f0ed] leading-[0.87] tracking-[-0.08em] sm:text-7xl">
          {copy.title}
        </h1>
        <p className="mt-7 max-w-xl text-[#a2a2a0] text-sm leading-7">{copy.body}</p>
      </div>
      <div className="flex min-h-64 flex-col justify-between border border-[#292929] bg-[#d9d9d6] p-6 text-[#151515] sm:p-8">
        <p className="font-mono text-[#555554] text-[10px] uppercase tracking-[0.2em]">
          Feature scaffold
        </p>
        <div>
          <p className="font-black text-6xl tracking-[-0.08em]">
            {navigation.findIndex((item) => item.id === panel) + 1}
          </p>
          <p className="mt-2 max-w-xs text-[#50504e] text-sm leading-6">
            The generated next-maker module is in place. This panel is ready for its local state and
            later service adapter.
          </p>
        </div>
      </div>
    </section>
  );
}

function LocalViewStatePanel({
  label,
  state,
}: {
  label: string;
  state: Exclude<LocalViewState, 'ready'>;
}) {
  const content = {
    empty: {
      body: 'Create the first local record to verify the workspace layout before connecting a service adapter.',
      title: `No local ${label} records`,
    },
    failure: {
      body: 'This is a deliberate local error state. When integrations begin, it will map to a recoverable service failure with the same visual boundary.',
      title: 'Local data unavailable',
    },
    loading: {
      body: 'The workspace is reserving the content area while a local request is in progress.',
      title: 'Loading local workspace',
    },
  }[state];

  return (
    <section className="flex min-h-96 flex-col justify-between border border-[#292929] bg-[#181818] p-6 sm:p-8">
      <p className="font-mono text-[#90908d] text-[10px] uppercase tracking-[0.2em]">
        Local UI state / {state}
      </p>
      <div className="max-w-2xl">
        <h1 className="font-black text-5xl text-[#f0f0ed] leading-[0.88] tracking-[-0.08em] sm:text-7xl">
          {content.title}
        </h1>
        <p className="mt-6 text-[#a2a2a0] text-sm leading-7">{content.body}</p>
      </div>
      <StatusPill>Demo mode</StatusPill>
    </section>
  );
}

export function KisokAdminConsole() {
  const [activePanel, setActivePanel] = useState<PanelId>('dashboard');
  const [isLocalAccessGateOpen, setIsLocalAccessGateOpen] = useState(false);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [viewState, setViewState] = useState<LocalViewState>('ready');
  const activeLabel = useMemo(
    () => navigation.find((item) => item.id === activePanel)?.label ?? 'Overview',
    [activePanel],
  );

  const content =
    viewState === 'ready' ? (
      {
        catalog: <CatalogTaxonomyPanel onAction={setLocalNotice} />,
        dashboard: <OverviewPanel />,
        inventory: <InventoryFeaturePanel onAction={setLocalNotice} />,
        media: <MediaLibraryPanel onAction={setLocalNotice} />,
        orders: <OrdersFeaturePanel />,
        products: <ProductCatalogPanel />,
        settings: <StoreSettingsPanel />,
        users: <AdminUsersPanel onAction={setLocalNotice} />,
      }[activePanel]
    ) : (
      <LocalViewStatePanel label={activeLabel.toLowerCase()} state={viewState} />
    );

  if (isLocalAccessGateOpen) {
    return <LocalAccessGate onEnter={() => setIsLocalAccessGateOpen(false)} />;
  }

  return (
    <main className="min-h-dvh bg-[#101010] text-[#f1f1ef]">
      <div className="mx-auto grid min-h-dvh max-w-[1720px] lg:grid-cols-[248px_1fr]">
        <aside className="border-[#2a2a2a] border-b bg-[#151515] p-5 lg:border-r lg:border-b-0 lg:p-6">
          <div className="flex items-start justify-between lg:block">
            <div>
              <p className="font-mono text-[#8f8f8c] text-[10px] uppercase tracking-[0.24em]">
                Kisok / Admin
              </p>
              <p className="mt-2 font-black text-3xl tracking-[-0.08em]">KISOK.</p>
            </div>
            <StatusPill>Local UI</StatusPill>
          </div>
          <nav
            className="mt-8 grid grid-cols-2 gap-px border border-[#2a2a2a] bg-[#2a2a2a] lg:block lg:border-0 lg:bg-transparent"
            aria-label="Administration sections"
          >
            {navigation.map((item) => {
              const active = item.id === activePanel;
              return (
                <button
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  className={`flex min-h-12 items-center justify-between px-3 text-left text-sm transition-colors lg:w-full lg:px-0 ${active ? 'bg-[#e7e7e4] font-bold text-[#111] lg:bg-transparent lg:text-[#f0f0ed]' : 'bg-[#151515] text-[#a1a19f] hover:bg-[#232323] hover:text-[#f0f0ed] lg:hover:bg-transparent'}`}
                  key={item.id}
                  onClick={() => {
                    setActivePanel(item.id);
                    setLocalNotice(null);
                    setViewState('ready');
                  }}
                  type="button"
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-[10px] opacity-60">{item.marker}</span>
                </button>
              );
            })}
          </nav>
          <div className="mt-8 hidden border-[#2b2b2b] border-t pt-5 lg:block">
            <p className="font-mono text-[#777775] text-[10px] uppercase tracking-[0.18em]">
              Data mode
            </p>
            <p className="mt-2 text-[#a5a5a2] text-xs leading-5">
              Local fixtures only. Supabase and Cloudinary remain intentionally disconnected.
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="flex items-center justify-between border-[#2a2a2a] border-b px-5 py-4 sm:px-8">
            <p className="font-mono text-[#8f8f8d] text-[10px] uppercase tracking-[0.2em]">
              Workspace / {activeLabel}
            </p>
            <div className="flex items-center gap-2">
              <button
                className="hidden border border-[#e7e7e4] px-2 py-1 font-mono text-[#e7e7e4] text-[9px] uppercase tracking-[0.12em] hover:bg-[#e7e7e4] hover:text-[#151515] sm:block"
                onClick={() => setIsLocalAccessGateOpen(true)}
                type="button"
              >
                Open local access gate
              </button>
              <button
                className="hidden border border-[#3a3a3a] px-2 py-1 font-mono text-[#a6a6a4] text-[9px] uppercase tracking-[0.12em] hover:border-[#dcdcd8] hover:text-[#f0f0ed] sm:block"
                onClick={() => setViewState('loading')}
                type="button"
              >
                Simulate loading state
              </button>
              <button
                className="hidden border border-[#3a3a3a] px-2 py-1 font-mono text-[#a6a6a4] text-[9px] uppercase tracking-[0.12em] hover:border-[#dcdcd8] hover:text-[#f0f0ed] sm:block"
                onClick={() => setViewState('empty')}
                type="button"
              >
                Simulate empty state
              </button>
              <button
                className="hidden border border-[#3a3a3a] px-2 py-1 font-mono text-[#a6a6a4] text-[9px] uppercase tracking-[0.12em] hover:border-[#dcdcd8] hover:text-[#f0f0ed] sm:block"
                onClick={() => setViewState('failure')}
                type="button"
              >
                Simulate failure state
              </button>
              <span className="size-2 rounded-full bg-[#dcdcd8]" aria-hidden="true" />
              <span className="font-mono text-[#a6a6a4] text-[10px] uppercase tracking-[0.16em]">
                System ready
              </span>
            </div>
          </header>
          <div className="p-5 sm:p-8 lg:p-10">
            {localNotice ? (
              <p
                className="mb-4 border-[#e7e7e4] border-l-2 bg-[#1a1a1a] px-4 py-3 font-mono text-[#dadad6] text-[10px] uppercase tracking-[0.14em]"
                role="status"
              >
                Local action / {localNotice}
              </p>
            ) : null}
            {content}
          </div>
        </div>
      </div>
    </main>
  );
}
