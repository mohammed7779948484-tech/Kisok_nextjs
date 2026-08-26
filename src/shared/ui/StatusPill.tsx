'use client';

import type { ComponentProps } from 'react';

import { Badge } from '@/components/ui/badge';

type StatusPillProps = Omit<ComponentProps<typeof Badge>, 'variant'>;

export function StatusPill({ className, ...props }: StatusPillProps) {
  return (
    <Badge
      {...props}
      className={`rounded-none border-[#454545] bg-transparent font-mono text-[10px] uppercase tracking-[0.16em] text-[#c7c7c7] ${className ?? ''}`}
      variant="outline"
    />
  );
}
