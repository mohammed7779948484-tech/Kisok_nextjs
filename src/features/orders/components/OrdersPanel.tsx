'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
  KisokTextarea,
  StatusPill,
} from '@/shared/ui';

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

function canCancel(status: OrderRecord['status']) {
  return status !== 'cancelled' && status !== 'completed';
}

export function OrdersPanel() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [cancellationOrder, setCancellationOrder] = useState<OrderRecord | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

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

  function openCancellation(order: OrderRecord) {
    setCancellationOrder(order);
    setCancellationReason('');
    setError(null);
  }

  function closeCancellation(open: boolean) {
    if (open) return;
    setCancellationOrder(null);
    setCancellationReason('');
  }

  async function cancelOrder() {
    if (!(cancellationOrder && cancellationReason.trim())) return;
    setUpdatingOrderId(cancellationOrder.id);
    setError(null);
    try {
      await ordersRepository.updateStatus(
        cancellationOrder.id,
        'cancelled',
        cancellationReason.trim(),
      );
      closeCancellation(false);
      await refresh();
    } catch {
      setError(`Order ${cancellationOrder.displayNumber} could not be cancelled.`);
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

              {order.items.length > 0 ? (
                <div className="mt-6 space-y-3 border-border border-t pt-4">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
                    Order Items
                  </p>
                  {order.items.map((item) => (
                    <div
                      className="border-border border-b pb-3 last:border-0 last:pb-0"
                      key={item.id}
                    >
                      <p className="font-semibold text-sm">{item.productName}</p>
                      <p className="mt-1 font-mono text-muted-foreground text-[10px]">
                        {item.variantName ? `${item.variantName} · ` : ''}
                        {item.variantSku}
                      </p>
                      {item.variantOptions ? (
                        <p className="mt-1 text-muted-foreground text-xs">{item.variantOptions}</p>
                      ) : null}
                      <p className="mt-1 text-muted-foreground text-xs">Quantity {item.quantity}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2 border-border border-t pt-4">
                {nextStatus(order.status) ? (
                  <KisokButton
                    disabled={updatingOrderId === order.id}
                    onClick={() => void advanceOrder(order)}
                    variant="outline"
                  >
                    {updatingOrderId === order.id ? 'Updating…' : 'Advance status'}
                  </KisokButton>
                ) : null}
                {canCancel(order.status) ? (
                  <KisokButton
                    disabled={updatingOrderId === order.id}
                    onClick={() => openCancellation(order)}
                    variant="quiet"
                  >
                    Cancel order
                  </KisokButton>
                ) : null}
              </div>
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

      <KisokDialog onOpenChange={closeCancellation} open={cancellationOrder !== null}>
        <KisokDialogContent>
          <KisokDialogHeader>
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
              Fulfillment control / cancellation
            </p>
            <KisokDialogTitle>Cancel order</KisokDialogTitle>
            <KisokDialogDescription>
              Cancellation restores reserved inventory through the Lean V2 transaction. A reason is
              required.
            </KisokDialogDescription>
          </KisokDialogHeader>
          <label className="grid gap-2" htmlFor="order-cancellation-reason">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
              Cancellation reason
            </span>
            <KisokTextarea
              aria-label="Cancellation reason"
              className="min-h-28 w-full resize-y"
              id="order-cancellation-reason"
              onChange={(event) => setCancellationReason(event.target.value)}
              placeholder="Describe why this order is being cancelled."
              value={cancellationReason}
            />
          </label>
          <KisokDialogFooter>
            <KisokButton
              disabled={updatingOrderId !== null}
              onClick={() => closeCancellation(false)}
              variant="quiet"
            >
              Keep order
            </KisokButton>
            <KisokButton
              disabled={updatingOrderId !== null || !cancellationReason.trim()}
              onClick={() => void cancelOrder()}
            >
              {updatingOrderId !== null ? 'Cancelling…' : 'Confirm cancellation'}
            </KisokButton>
          </KisokDialogFooter>
        </KisokDialogContent>
      </KisokDialog>
    </section>
  );
}
