import { PlusIcon } from 'lucide-react';

import { KisokButton } from '@/shared/ui';

import type { VariantOptionValueRecord, VariantRecord } from '../../types';
import type { VariantEligibility } from '../../utils/product-visibility';
import { ProductVariantCard } from './ProductVariantCard';

type ProductVariantsTabProps = {
  onAddVariant: () => void;
  onDeleteVariant: (variant: VariantRecord) => void;
  onEditVariant: (variant: VariantRecord) => void;
  onMedia: (variant: VariantRecord) => void;
  onOptions: (variant: VariantRecord) => void;
  productId?: string;
  readOnly: boolean;
  variantMediaCounts: Record<string, number>;
  variantEligibilityById: Record<string, VariantEligibility>;
  variantOptionsById: Record<string, VariantOptionValueRecord[]>;
  variants: VariantRecord[];
};

export function ProductVariantsTab({
  onAddVariant,
  onDeleteVariant,
  onEditVariant,
  onMedia,
  onOptions,
  productId,
  readOnly,
  variantMediaCounts,
  variantEligibilityById,
  variantOptionsById,
  variants,
}: ProductVariantsTabProps) {
  if (!productId) {
    return (
      <section className="border border-border bg-card p-5 text-card-foreground">
        <h2 className="font-black text-2xl tracking-[-0.06em]">Variants</h2>
        <p className="mt-2 max-w-xl text-muted-foreground text-sm">
          Save this Product draft before creating Variants. Variants represent the actual selectable
          Product configurations and always begin inactive.
        </p>
      </section>
    );
  }

  return (
    <section className="border border-border bg-card p-5 text-card-foreground">
      <div className="flex flex-col justify-between gap-3 border-border border-b pb-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-black text-2xl tracking-[-0.06em]">Variants</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Configure the operational Product choices customers may see once they are active and
            valid.
          </p>
        </div>
        {!readOnly ? (
          <KisokButton onClick={onAddVariant} type="button" variant="outline">
            <PlusIcon /> Add Variant
          </KisokButton>
        ) : null}
      </div>

      {variants.length === 0 ? (
        <div className="mt-5 grid gap-3 border border-dashed border-border p-5">
          <div>
            <h3 className="font-bold">No Variants yet</h3>
            <p className="mt-1 text-muted-foreground text-sm">
              Variants represent the actual selectable Product configurations.
            </p>
          </div>
          {!readOnly ? (
            <KisokButton className="w-fit" onClick={onAddVariant} type="button" variant="outline">
              <PlusIcon /> Add first Variant
            </KisokButton>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {variants.map((variant) => (
            <ProductVariantCard
              eligibility={variantEligibilityById[variant.id]}
              key={variant.id}
              mediaCount={variantMediaCounts[variant.id] ?? 0}
              onDelete={() => onDeleteVariant(variant)}
              onEdit={() => onEditVariant(variant)}
              onMedia={() => onMedia(variant)}
              onOptions={() => onOptions(variant)}
              readOnly={readOnly}
              selections={variantOptionsById[variant.id] ?? []}
              variant={variant}
            />
          ))}
        </div>
      )}
    </section>
  );
}
