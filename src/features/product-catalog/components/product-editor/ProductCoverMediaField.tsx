import { ImagePlusIcon } from 'lucide-react';

import type { MediaAssetRecord } from '@/features/media-library/types';
import { KisokButton } from '@/shared/ui';

type ProductCoverMediaFieldProps = {
  asset: MediaAssetRecord | null;
  disabled: boolean;
  onChoose: () => void;
  onRemove: () => void;
  productName: string;
};

export function ProductCoverMediaField({
  asset,
  disabled,
  onChoose,
  onRemove,
  productName,
}: ProductCoverMediaFieldProps) {
  return (
    <section className="border border-border p-5">
      <div className="border-border border-b pb-4">
        <h2 className="font-black text-2xl tracking-[-0.06em]">Product cover</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Select a reusable image from the Media Library or upload a new one.
        </p>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-[13rem_1fr]">
        <div className="flex aspect-square items-center justify-center overflow-hidden border border-dashed border-border bg-muted">
          {asset ? (
            <img
              alt={`${productName || 'Product'} cover`}
              className="h-full w-full object-cover"
              height={asset.height ?? undefined}
              src={asset.secureUrl}
              width={asset.width ?? undefined}
            />
          ) : (
            <div className="grid place-items-center gap-3 p-6 text-center text-muted-foreground">
              <ImagePlusIcon aria-hidden="true" className="size-9" />
              <span className="text-sm">No cover image selected</span>
            </div>
          )}
        </div>
        <div className="grid content-start gap-3">
          <p className="text-muted-foreground text-sm">
            {asset
              ? 'The selected image will become the Product cover.'
              : 'A cover is optional while the Product is a draft.'}
          </p>
          {!disabled ? (
            <div className="flex flex-wrap gap-2">
              <KisokButton onClick={onChoose} type="button" variant="outline">
                {asset ? 'Change image' : 'Add Product image'}
              </KisokButton>
              {asset ? (
                <KisokButton onClick={onRemove} type="button" variant="quiet">
                  Remove image
                </KisokButton>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
