import { PencilIcon } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { KisokButton } from '@/shared/ui';

type ProductEditorHeaderProps = {
  isReadOnly: boolean;
  isSaving: boolean;
  mode: 'create' | 'edit' | 'show';
  onLeave: () => void;
  onSave: (target?: 'return' | 'continue') => void;
  productId?: string;
  productName?: string;
  saveDisabled: boolean;
};

export function ProductEditorHeader({
  isReadOnly,
  isSaving,
  mode,
  onLeave,
  onSave,
  productId,
  productName,
  saveDisabled,
}: ProductEditorHeaderProps) {
  const title = mode === 'create' ? 'Create Product' : (productName ?? 'Product');

  return (
    <header className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
      <div>
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
          Product catalog /{' '}
          {mode === 'create' ? 'new draft' : mode === 'show' ? 'read-only' : 'edit'}
        </p>
        <h1 className="mt-2 font-black text-4xl tracking-[-0.08em] sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground text-sm">
          {mode === 'create'
            ? 'Save an inactive Product draft first. Configure Variants and customer visibility before activation.'
            : 'Manage Product identity, classification, Media, and Variants in one dedicated workflow.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <KisokButton onClick={onLeave} type="button" variant="outline">
          Back to Products
        </KisokButton>
        {isReadOnly && productId ? (
          <Link
            className={buttonVariants({ variant: 'outline' })}
            href={`/admin/products/${productId}/edit`}
          >
            <PencilIcon /> Edit Product
          </Link>
        ) : null}
        {!isReadOnly ? (
          <>
            {mode === 'create' ? (
              <>
                <KisokButton
                  disabled={saveDisabled}
                  onClick={() => onSave('continue')}
                  type="button"
                  variant="outline"
                >
                  {isSaving ? 'Saving…' : 'Save & Add Variants'}
                </KisokButton>
                <KisokButton disabled={saveDisabled} onClick={() => onSave('return')} type="button">
                  {isSaving ? 'Saving…' : 'Save draft'}
                </KisokButton>
              </>
            ) : (
              <>
                <KisokButton
                  disabled={saveDisabled}
                  onClick={() => onSave('continue')}
                  type="button"
                  variant="outline"
                >
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </KisokButton>
                <KisokButton disabled={saveDisabled} onClick={() => onSave('return')} type="button">
                  {isSaving ? 'Saving…' : 'Save & Return'}
                </KisokButton>
              </>
            )}
          </>
        ) : null}
      </div>
    </header>
  );
}
