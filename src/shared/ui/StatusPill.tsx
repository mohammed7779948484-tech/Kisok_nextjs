'use client';

import type { ComponentProps } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

const statusPillVariants = cva(
  'rounded-full bg-transparent px-2.5 font-mono text-[10px] uppercase tracking-[0.14em]',
  {
    variants: {
      tone: {
        neutral: 'border-border text-muted-foreground',
        success: 'border-success/35 bg-success/10 text-success',
        warning: 'border-warning/40 bg-warning/10 text-warning',
        destructive: 'border-destructive/35 bg-destructive/10 text-destructive',
        info: 'border-info/35 bg-info/10 text-info',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

type StatusPillProps = Omit<ComponentProps<typeof Badge>, 'variant'> &
  VariantProps<typeof statusPillVariants>;

export function StatusPill({ className, tone, ...props }: StatusPillProps) {
  return (
    <Badge {...props} className={cn(statusPillVariants({ tone }), className)} variant="outline" />
  );
}
