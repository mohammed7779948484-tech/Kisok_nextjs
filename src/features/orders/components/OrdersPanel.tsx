'use client';

import { useState } from 'react';

import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
  StatusPill,
} from '@/shared/ui';

import { ordersRepository } from '../repositories';
import type { LocalOrder } from '../types';

export function OrdersPanel({ onAction }: { onAction: (message: string) => void }) {
  const [cancellationReason, setCancellationReason] = useState('');
  const [handoffNote, setHandoffNote] = useState('');
  const [orderForCancellation, setOrderForCancellation] = useState<LocalOrder | null>(null);
  const [orderForHandoff, setOrderForHandoff] = useState<LocalOrder | null>(null);
  const orderRows = ordersRepository.list();

  function stageCancellation() {
    if (orderForCancellation) {
      onAction(`Cancellation staged for ${orderForCancellation.id}`);
    }
    setCancellationReason('');
    setOrderForCancellation(null);
  }

  function stageHandoff() {
    if (orderForHandoff) {
      onAction(`Handoff staged for ${orderForHandoff.id}`);
    }
    setHandoffNote('');
    setOrderForHandoff(null);
  }

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
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <KisokButton
                aria-label={`Review handoff for ${order.id}`}
                onClick={() => setOrderForHandoff(order)}
                size="compact"
                variant="outline"
              >
                Review handoff
              </KisokButton>
              <KisokButton
                aria-label={`Review cancellation for ${order.id}`}
                onClick={() => setOrderForCancellation(order)}
                size="compact"
                variant="quiet"
              >
                Review cancellation
              </KisokButton>
            </div>
          </article>
        ))}
      </div>
      <KisokDialog
        onOpenChange={(open) => {
          if (!open) {
            setOrderForCancellation(null);
          }
        }}
        open={Boolean(orderForCancellation)}
      >
        <KisokDialogContent>
          <KisokDialogHeader>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#969694]">
              Fulfillment queue / local action
            </p>
            <KisokDialogTitle>Cancel local order</KisokDialogTitle>
            <KisokDialogDescription>
              {orderForCancellation?.id} will remain unchanged until the integration phase. Capture
              a reason now so the eventual audit contract has a clear local counterpart.
            </KisokDialogDescription>
          </KisokDialogHeader>
          <label className="grid gap-2" htmlFor="order-cancellation-reason">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#c2c2be]">
              Cancellation reason
            </span>
            <textarea
              className="min-h-28 w-full resize-y border border-[#4c4c4c] bg-[#111111] p-3 text-[#f0f0ed] text-sm outline-none placeholder:text-[#6d6d6a] focus:border-[#e7e7e4]"
              id="order-cancellation-reason"
              onChange={(event) => setCancellationReason(event.target.value)}
              placeholder="Explain why fulfillment should be stopped."
              value={cancellationReason}
            />
          </label>
          <KisokDialogFooter>
            <KisokButton onClick={() => setOrderForCancellation(null)} variant="quiet">
              Keep order
            </KisokButton>
            <KisokButton
              disabled={!cancellationReason.trim()}
              onClick={stageCancellation}
              variant="destructive"
            >
              Stage local cancellation
            </KisokButton>
          </KisokDialogFooter>
        </KisokDialogContent>
      </KisokDialog>
      <KisokDialog
        onOpenChange={(open) => {
          if (!open) {
            setOrderForHandoff(null);
          }
        }}
        open={Boolean(orderForHandoff)}
      >
        <KisokDialogContent>
          <KisokDialogHeader>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#969694]">
              Fulfillment queue / local action
            </p>
            <KisokDialogTitle>Confirm local handoff</KisokDialogTitle>
            <KisokDialogDescription>
              {orderForHandoff?.id} remains unchanged in this local workspace. Record a handoff note
              before staging the future fulfillment action.
            </KisokDialogDescription>
          </KisokDialogHeader>
          <label className="grid gap-2" htmlFor="order-handoff-note">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#c2c2be]">
              Handoff note
            </span>
            <textarea
              className="min-h-28 w-full resize-y border border-[#4c4c4c] bg-[#111111] p-3 text-[#f0f0ed] text-sm outline-none placeholder:text-[#6d6d6a] focus:border-[#e7e7e4]"
              id="order-handoff-note"
              onChange={(event) => setHandoffNote(event.target.value)}
              placeholder="Record the delivery or pickup handoff."
              value={handoffNote}
            />
          </label>
          <KisokDialogFooter>
            <KisokButton onClick={() => setOrderForHandoff(null)} variant="quiet">
              Keep order
            </KisokButton>
            <KisokButton disabled={!handoffNote.trim()} onClick={stageHandoff}>
              Stage local handoff
            </KisokButton>
          </KisokDialogFooter>
        </KisokDialogContent>
      </KisokDialog>
    </section>
  );
}
