import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
} from '@/shared/ui';

export interface ConfirmActionDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  isWorking?: boolean;
  destructive?: boolean;
}

/**
 * Shared confirmation step for actions that shouldn't fire on a single
 * click: the cautionary "this may hide things from customers" warning
 * before a deactivate, and the destructive "this cannot be undone" warning
 * before a hard delete. Both reuse the same `KisokDialog` shell — only the
 * copy and the confirm button's styling differ.
 */
export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  isWorking = false,
  destructive = false,
}: ConfirmActionDialogProps) {
  return (
    <KisokDialog onOpenChange={(next) => !(next || isWorking) && onCancel()} open={open}>
      <KisokDialogContent>
        <KisokDialogHeader>
          <KisokDialogTitle>{title}</KisokDialogTitle>
          <KisokDialogDescription>{description}</KisokDialogDescription>
        </KisokDialogHeader>
        <KisokDialogFooter>
          <KisokButton disabled={isWorking} onClick={onCancel} type="button" variant="quiet">
            Cancel
          </KisokButton>
          <KisokButton
            disabled={isWorking}
            onClick={onConfirm}
            type="button"
            variant={destructive ? 'destructive' : 'outline'}
          >
            {isWorking ? 'Working…' : confirmLabel}
          </KisokButton>
        </KisokDialogFooter>
      </KisokDialogContent>
    </KisokDialog>
  );
}
