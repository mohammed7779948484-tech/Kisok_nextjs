'use client';

import { useCallback, useEffect, useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
import { ORDERS_PAGE_SIZE } from '../repositories/supabase';
import type { OrderRecord } from '../types';

function statusLabel(status: OrderRecord['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * `update_order_status` (Lean V2) restricts each actor role to its own
 * transitions: Preparation owns new→preparing and preparing→ready; Admin
 * owns only ready→completed. This panel is the Admin surface, so it must
 * never offer the Preparation-only advances.
 */
function nextStatusForAdmin(status: OrderRecord['status']): OrderRecord['status'] | null {
  return status === 'ready' ? 'completed' : null;
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
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ordersRepository.listOrders({ includeCompleted });
      setOrders(result);
      setHasMore(result.length >= ORDERS_PAGE_SIZE);
    } catch {
      setError('Orders could not be loaded. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [includeCompleted]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function loadOlderOrders() {
    const cursor = orders.at(-1)?.createdAt;
    if (!cursor) return;
    setLoadingMore(true);
    setError(null);
    try {
      const older = await ordersRepository.listOrders({ includeCompleted, before: cursor });
      setOrders((previous) => [...previous, ...older]);
      setHasMore(older.length >= ORDERS_PAGE_SIZE);
    } catch {
      setError('Older orders could not be loaded.');
    } finally {
      setLoadingMore(false);
    }
  }

  async function advanceOrder(order: OrderRecord) {
    const targetStatus = nextStatusForAdmin(order.status);
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
    <section className="space-y-6 rounded-2xl border border-border bg-card/65 p-4 shadow-panel sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
            Fulfillment queue / hosted data
          </p>
          <h1 className="mt-2 text-balance font-black text-4xl tracking-[-0.05em] sm:text-5xl">
            Order queue
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground text-sm leading-6">
            Work operational records through their Lean V2 status lifecycle.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={includeCompleted}
              id="orders-include-completed"
              onCheckedChange={(checked) => setIncludeCompleted(checked === true)}
            />
            <Label className="text-muted-foreground text-xs" htmlFor="orders-include-completed">
              Include completed &amp; cancelled
            </Label>
          </div>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Refresh
          </KisokButton>
        </div>
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
            <article
              className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-panel motion-reduce:transform-none"
              key={order.id}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-muted-foreground text-xs">{order.displayNumber}</p>
                <StatusPill
                  tone={
                    order.status === 'completed'
                      ? 'success'
                      : order.status === 'cancelled'
                        ? 'destructive'
                        : order.status === 'ready'
                          ? 'info'
                          : 'warning'
                  }
                >
                  {statusLabel(order.status)}
                </StatusPill>
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
                {nextStatusForAdmin(order.status) ? (
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
                    variant="destructive"
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

      {!(loading || error) && hasMore ? (
        <div className="flex justify-center">
          <KisokButton
            disabled={loadingMore}
            onClick={() => void loadOlderOrders()}
            variant="outline"
          >
            {loadingMore ? 'Loading…' : 'Load older orders'}
          </KisokButton>
        </div>
      ) : null}

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
              variant="destructive"
            >
              {updatingOrderId !== null ? 'Cancelling…' : 'Confirm cancellation'}
            </KisokButton>
          </KisokDialogFooter>
        </KisokDialogContent>
      </KisokDialog>
    </section>
  );
}
