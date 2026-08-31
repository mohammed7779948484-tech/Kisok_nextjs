import { ImageIcon } from 'lucide-react';

import { KisokButton, StatusPill } from '@/shared/ui';

import type { VariantOptionValueRecord, VariantRecord } from '../../types';
import type { VariantEligibility } from '../../utils/product-visibility';
import { deriveVariantDisplayName } from '../../utils/variant-display-name';

type ProductVariantCardProps = {
  eligibility?: VariantEligibility;
  mediaCount?: number;
  mediaStatus?: 'loading' | 'error' | 'ready' | 'not-requested';
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
  mediaStatus = 'ready',
  onDelete,
  onEdit,
  onMedia,
  onOptions,
  readOnly,
  selections,
  variant,
}: ProductVariantCardProps) {
  const displayName = deriveVariantDisplayName(variant.titleOverride, selections, variant.sku);

  const mediaLabel =
    mediaStatus === 'loading'
      ? 'Loading…'
      : mediaStatus === 'error'
        ? 'Unavailable'
        : `${mediaCount} ${mediaCount === 1 ? 'image' : 'images'}`;

  return (
    <article className="grid gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/25 hover:bg-accent/15 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-base break-words">{displayName}</h3>
          <StatusPill tone={variant.isActive ? 'success' : 'warning'}>
            {variant.isActive ? 'Active' : 'Inactive'}
          </StatusPill>
          {eligibility ? (
            <StatusPill tone={eligibility.isCustomerEligible ? 'success' : 'warning'}>
              {eligibility.isCustomerEligible ? 'Ready' : 'Blocked'}
            </StatusPill>
          ) : null}
        </div>
        <p className="mt-2 font-mono text-muted-foreground text-xs break-all">SKU: {variant.sku}</p>
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-muted-foreground text-xs">
          <div>
            <dt className="sr-only">Barcode</dt>
            <dd className="break-all">Barcode: {variant.barcode || 'Not set'}</dd>
          </div>
          <div>
            <dt className="sr-only">Low-stock threshold</dt>
            <dd>Low-stock: {variant.lowStockThreshold ?? 'Store default'}</dd>
          </div>
          <div className="inline-flex items-center gap-1">
            <ImageIcon aria-hidden="true" className="size-3" />
            <dt className="sr-only">Images</dt>
            <dd>{mediaLabel}</dd>
          </div>
        </dl>
        {eligibility && !eligibility.isCustomerEligible ? (
          <p className="mt-3 text-warning text-xs">{eligibility.reasons.join(' ')}</p>
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
          <KisokButton onClick={onEdit} size="sm" type="button" variant="outline">
            Edit
          </KisokButton>
          <KisokButton onClick={onOptions} size="sm" type="button" variant="quiet">
            Options
          </KisokButton>
          <KisokButton onClick={onMedia} size="sm" type="button" variant="quiet">
            Media
          </KisokButton>
          <KisokButton onClick={onDelete} size="sm" type="button" variant="destructive">
            Delete
          </KisokButton>
        </div>
      ) : null}
    </article>
  );
}
