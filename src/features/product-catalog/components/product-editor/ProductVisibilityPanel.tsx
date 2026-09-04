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
  const readinessHeading = !isActive
    ? 'Complete these items before activation:'
    : 'Fix these items to restore storefront visibility:';

  return (
    <aside className="h-fit rounded-2xl border border-border bg-muted/30 p-5 xl:sticky xl:top-24">
      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
        Product readiness
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusPill tone={isActive ? 'success' : 'warning'}>
          {isActive ? 'Active' : 'Draft'}
        </StatusPill>
        <StatusPill tone={visibility.isCustomerVisible ? 'success' : 'warning'}>
          {visibility.isCustomerVisible ? 'Visible' : 'Hidden'}
        </StatusPill>
      </div>
      {visibility.isCustomerVisible ? (
        <p className="mt-4 text-sm">
          The Product meets all customer catalog eligibility checks and is ready for storefront
          display.
        </p>
      ) : (
        <div className="mt-4 grid gap-2 text-muted-foreground text-sm">
          <p className="font-medium text-foreground">{readinessHeading}</p>
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
          <dt>Cover image</dt>
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
