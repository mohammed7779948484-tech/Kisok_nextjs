import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
} from '@/shared/ui';

import type { VariantRecord } from '../../types';

type ProductDeleteVariantDialogProps = {
  historyBlocked: boolean;
  isWorking: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  variant: VariantRecord | null;
};

export function ProductDeleteVariantDialog({
  historyBlocked,
  isWorking,
  onCancel,
  onConfirm,
  variant,
}: ProductDeleteVariantDialogProps) {
  return (
    <KisokDialog
      onOpenChange={(open) => !(open || isWorking) && onCancel()}
      open={variant !== null}
    >
      <KisokDialogContent>
        <KisokDialogHeader>
          <KisokDialogTitle>
            {historyBlocked
              ? `Deletion blocked · ${variant?.sku}`
              : `Delete Variant · ${variant?.sku}`}
          </KisokDialogTitle>
          <KisokDialogDescription>
            {historyBlocked
              ? 'This Variant is referenced by historical Orders, so Lean V2 protects it from deletion. You may deactivate it instead; historical records will remain intact.'
              : 'This permanently deletes the Variant only when it has no protected historical Order references.'}
          </KisokDialogDescription>
        </KisokDialogHeader>
        <KisokDialogFooter>
          <KisokButton disabled={isWorking} onClick={onCancel} type="button" variant="quiet">
            Cancel
          </KisokButton>
          <KisokButton disabled={isWorking} onClick={onConfirm} type="button" variant="outline">
            {isWorking ? 'Working…' : historyBlocked ? 'Deactivate Variant' : 'Delete Variant'}
          </KisokButton>
        </KisokDialogFooter>
      </KisokDialogContent>
    </KisokDialog>
  );
}
