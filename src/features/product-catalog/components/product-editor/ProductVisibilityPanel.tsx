import { StatusPill } from '@/shared/ui';

import type { ProductVisibility } from '../../utils/product-visibility';

type ProductVisibilityPanelProps = {
  categoriesCount: number;
  hasCover: boolean;
  isActive: boolean;
  visibility: ProductVisibility;
  variantsCount: number;
};

export function ProductVisibilityPanel({
  categoriesCount,
  hasCover,
  isActive,
  visibility,
  variantsCount,
}: ProductVisibilityPanelProps) {
  return (
    <aside className="h-fit border border-border p-5 xl:sticky xl:top-5">
      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
        Product readiness
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusPill
          className={isActive ? undefined : 'border-amber-500 text-amber-700 dark:text-amber-300'}
        >
          {isActive ? 'Active' : 'Draft'}
        </StatusPill>
        <StatusPill
          className={
            visibility.isCustomerVisible
              ? undefined
              : 'border-amber-500 text-amber-700 dark:text-amber-300'
          }
        >
          {visibility.isCustomerVisible ? 'Customer visible' : 'Customer hidden'}
        </StatusPill>
      </div>
      {visibility.isCustomerVisible ? (
        <p className="mt-4 text-sm">
          The Product meets the current Lean V2 customer-catalog eligibility checks.
        </p>
      ) : (
        <div className="mt-4 grid gap-2 text-muted-foreground text-sm">
          <p className="font-medium text-foreground">Complete these items before activation:</p>
          <ul className="grid gap-2 pl-4">
            {visibility.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      <dl className="mt-6 grid gap-2 border-border border-t pt-4 text-muted-foreground text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt>Classification</dt>
          <dd>{categoriesCount > 0 ? `${categoriesCount} assigned` : 'Optional'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>Cover</dt>
          <dd>{hasCover ? 'Selected' : 'Optional'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>Variants</dt>
          <dd>{variantsCount}</dd>
        </div>
      </dl>
    </aside>
  );
}
