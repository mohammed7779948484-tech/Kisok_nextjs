'use client';

import type React from 'react';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

import { cn } from '@/lib/cn';

export function KisokDialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="kisok-dialog" {...props} />;
}

export function KisokDialogContent({ children, className, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] data-closed:opacity-0 data-open:opacity-100" />
      <DialogPrimitive.Popup
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 gap-6 border border-[#5c5c5c] bg-[#181818] p-6 text-[#f0f0ed] shadow-[16px_16px_0_#080808] outline-none sm:p-8',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

export function KisokDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-3', className)} {...props} />;
}

export function KisokDialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      className={cn(
        'font-black text-4xl leading-[0.9] tracking-[-0.07em] text-[#f0f0ed] sm:text-5xl',
        className,
      )}
      {...props}
    />
  );
}

export function KisokDialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm leading-6 text-[#a6a6a2]', className)}
      {...props}
    />
  );
}

export function KisokDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}
