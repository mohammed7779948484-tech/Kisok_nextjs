'use client';

import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const kisokButtonVariants = cva(
  'inline-flex min-h-10 items-center justify-center border px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0f0ed] disabled:pointer-events-none disabled:opacity-45',
  {
    defaultVariants: {
      size: 'default',
      variant: 'primary',
    },
    variants: {
      size: {
        compact: 'min-h-8 px-2 py-1 text-[9px]',
        default: '',
      },
      variant: {
        destructive:
          'border-[#d6d6d2] bg-[#d6d6d2] text-[#171717] hover:border-[#f0f0ed] hover:bg-[#f0f0ed]',
        outline:
          'border-[#ebebe7] bg-transparent text-[#ebebe7] hover:bg-[#ebebe7] hover:text-[#121212]',
        primary: 'border-[#e7e7e4] bg-[#e7e7e4] text-[#141414] hover:bg-[#ffffff]',
        quiet:
          'border-[#484848] bg-transparent text-[#bcbcb8] hover:border-[#e7e7e4] hover:text-[#f0f0ed]',
      },
    },
  },
);

export function KisokButton({
  className,
  size,
  variant,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof kisokButtonVariants>) {
  return (
    <ButtonPrimitive className={cn(kisokButtonVariants({ className, size, variant }))} {...props} />
  );
}
