import { ImageIcon } from 'lucide-react';

import { KisokButton, StatusPill } from '@/shared/ui';

import type { VariantOptionValueRecord, VariantRecord } from '../../types';
import type { VariantEligibility } from '../../utils/product-visibility';
import { deriveVariantDisplayName } from '../../utils/variant-display-name';

type ProductVariantCardProps = {
  eligibility?: VariantEligibility;
  mediaCount?: number;
  onDelete: () => void;
  onEdit: () => void;
  onMedia: () => void;
  onOptions: () => void;
  readOnly: boolean;
  selections: VariantOptionValueRecord[];
  variant: VariantRecord;
};

export function ProductVariantCard({
  eligibility,
  mediaCount = 0,
  onDelete,
  onEdit,
  onMedia,
  onOptions,
  readOnly,
  selections,
  variant,
}: ProductVariantCardProps) {
  const displayName = deriveVariantDisplayName(variant.titleOverride, selections, variant.sku);

  return (
    <article className="grid gap-4 border border-border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-base">{displayName}</h3>
          <StatusPill
            className={
              variant.isActive ? undefined : 'border-amber-500 text-amber-700 dark:text-amber-300'
            }
          >
            {variant.isActive ? 'Active' : 'Draft'}
          </StatusPill>
          {eligibility ? (
            <StatusPill
              className={
                eligibility.isCustomerEligible
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-300'
                  : 'border-amber-500 text-amber-700 dark:text-amber-300'
              }
            >
              {eligibility.isCustomerEligible ? 'Customer eligible' : 'Customer hidden'}
            </StatusPill>
          ) : null}
        </div>
        <p className="mt-2 font-mono text-muted-foreground text-xs">SKU: {variant.sku}</p>
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-muted-foreground text-xs">
          <div>
            <dt className="sr-only">Barcode</dt>
            <dd>Barcode: {variant.barcode || 'Not set'}</dd>
          </div>
          <div>
            <dt className="sr-only">Low-stock threshold</dt>
            <dd>Low-stock: {variant.lowStockThreshold ?? 'Store default'}</dd>
          </div>
          <div className="inline-flex items-center gap-1">
            <ImageIcon aria-hidden="true" className="size-3" />
            <dt className="sr-only">Images</dt>
            <dd>{mediaCount} images</dd>
          </div>
        </dl>
        {eligibility && !eligibility.isCustomerEligible ? (
          <p className="mt-3 text-amber-700 text-xs dark:text-amber-300">
            {eligibility.reasons.join(' ')}
          </p>
        ) : null}
        {selections.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {selections.map((selection) => (
              <li
                className="rounded-full border border-border px-2 py-1 text-xs"
                key={selection.optionTypeId}
              >
                {selection.optionTypeName}: {selection.optionValueName}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-muted-foreground text-xs">No Option Values assigned.</p>
        )}
      </div>
      {!readOnly ? (
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <KisokButton onClick={onOptions} size="sm" type="button" variant="quiet">
            Options
          </KisokButton>
          <KisokButton onClick={onMedia} size="sm" type="button" variant="quiet">
            Media
          </KisokButton>
          <KisokButton onClick={onEdit} size="sm" type="button" variant="quiet">
            Edit
          </KisokButton>
          <KisokButton onClick={onDelete} size="sm" type="button" variant="quiet">
            Delete
          </KisokButton>
        </div>
      ) : null}
    </article>
  );
}
