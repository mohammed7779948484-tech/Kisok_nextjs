'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusPill } from '@/shared/ui';

import { ordersRepository } from '../repositories';
import type { LocalOrder } from '../types';

export function OrdersPanel({
  onAction = () => undefined,
}: {
  onAction?: (message: string) => void;
}) {
  const [orderForCancellation, setOrderForCancellation] = useState<LocalOrder | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const orderRows = ordersRepository.list();

  function cancelOrder() {
    if (!(orderForCancellation && cancellationReason.trim())) return;
    onAction(`Cancellation recorded for ${orderForCancellation.id}`);
    setCancellationReason('');
    setOrderForCancellation(null);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
            Fulfillment queue
          </p>
          <h1 className="mt-2 font-black text-5xl tracking-[-0.08em] sm:text-6xl">Order queue</h1>
          <p className="mt-3 max-w-xl text-muted-foreground text-sm leading-6">
            Work the operational queue through preparation, ready, completed, or cancelled states.
          </p>
        </div>
        <StatusPill>Operational records</StatusPill>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {orderRows.map((order) => (
          <article className="border border-border bg-card p-5" key={order.id}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-muted-foreground text-xs">#{order.id}</p>
              <StatusPill>{order.status}</StatusPill>
            </div>
            <p className="mt-8 font-black text-4xl tracking-[-0.07em]">
              {String(order.itemCount).padStart(2, '0')}
            </p>
            <p className="mt-1 text-muted-foreground text-xs uppercase tracking-[0.15em]">
              line items
            </p>
            <dl className="mt-6 grid gap-2 border-border border-t pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{order.createdAt}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Customer</dt>
                <dd>{order.customerLabel}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              {order.status === 'New' ||
              order.status === 'Preparing' ||
              order.status === 'Ready' ? (
                <Button onClick={() => onAction(`Next status staged for ${order.id}`)} size="sm">
                  Advance status
                </Button>
              ) : null}
              {order.status !== 'Completed' && order.status !== 'Cancelled' ? (
                <Button onClick={() => setOrderForCancellation(order)} size="sm" variant="outline">
                  Cancel
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {orderForCancellation ? (
        <div
          className="border border-destructive/40 bg-destructive/5 p-5"
          role="dialog"
          aria-labelledby="cancel-order-title"
        >
          <h2 className="font-semibold" id="cancel-order-title">
            Cancel #{orderForCancellation.id}
          </h2>
          <p className="mt-2 text-muted-foreground text-sm">
            A reason is required and will be kept with the operational record.
          </p>
          <label className="mt-4 grid gap-2 text-sm" htmlFor="order-cancellation-reason">
            Reason
            <Textarea
              autoFocus
              id="order-cancellation-reason"
              onChange={(event) => setCancellationReason(event.target.value)}
              placeholder="Explain why fulfillment should stop."
              value={cancellationReason}
            />
          </label>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => {
                setOrderForCancellation(null);
                setCancellationReason('');
              }}
              variant="ghost"
            >
              Keep order
            </Button>
            <Button
              disabled={!cancellationReason.trim()}
              onClick={cancelOrder}
              variant="destructive"
            >
              Confirm cancellation
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
