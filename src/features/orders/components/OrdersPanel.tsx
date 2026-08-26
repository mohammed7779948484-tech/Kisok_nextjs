'use client';

import { useCallback, useEffect, useState } from 'react';

import { KisokButton, StatusPill } from '@/shared/ui';

import { ordersRepository } from '../repositories';
import type { OrderRecord } from '../types';

function statusLabel(status: OrderRecord['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function nextStatus(status: OrderRecord['status']): OrderRecord['status'] | null {
  if (status === 'new') return 'preparing';
  if (status === 'preparing') return 'ready';
  if (status === 'ready') return 'completed';
  return null;
}

export function OrdersPanel() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await ordersRepository.listOrders());
    } catch {
      setError('Orders could not be loaded. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function advanceOrder(order: OrderRecord) {
    const targetStatus = nextStatus(order.status);
    if (!targetStatus) return;
    setUpdatingOrderId(order.id);
    setError(null);
    try {
      await ordersRepository.updateStatus(order.id, targetStatus);
      await refresh();
    } catch {
      setError(`Order ${order.displayNumber} could not be advanced.`);
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
            Fulfillment queue / hosted data
          </p>
          <h1 className="mt-2 font-black text-5xl tracking-[-0.08em] sm:text-6xl">Order queue</h1>
          <p className="mt-3 max-w-xl text-muted-foreground text-sm leading-6">
            Work operational records through their Lean V2 status lifecycle.
          </p>
        </div>
        <KisokButton onClick={() => void refresh()} variant="outline">
          Refresh
        </KisokButton>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm" role="status">
          Loading orders…
        </p>
      ) : error ? (
        <div className="grid gap-3" role="alert">
          <p className="text-destructive text-sm">{error}</p>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Try again
          </KisokButton>
        </div>
      ) : orders.length === 0 ? (
        <p className="text-muted-foreground text-sm">No orders are available.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {orders.map((order) => (
            <article className="border border-border bg-card p-5" key={order.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-muted-foreground text-xs">{order.displayNumber}</p>
                <StatusPill>{statusLabel(order.status)}</StatusPill>
              </div>
              <p className="mt-8 font-black text-4xl tracking-[-0.07em]">{order.itemCount}</p>
              <p className="mt-1 text-muted-foreground text-xs uppercase tracking-[0.15em]">
                line items
              </p>
              {nextStatus(order.status) ? (
                <KisokButton
                  className="mt-6"
                  disabled={updatingOrderId === order.id}
                  onClick={() => void advanceOrder(order)}
                  variant="outline"
                >
                  {updatingOrderId === order.id ? 'Updating…' : 'Advance status'}
                </KisokButton>
              ) : null}
              <dl className="mt-6 grid gap-2 border-border border-t pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{new Date(order.createdAt).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Record ID</dt>
                  <dd className="font-mono text-xs">{order.id}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
