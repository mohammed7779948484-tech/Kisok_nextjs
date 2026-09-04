'use client';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
  KisokInput,
  KisokTextarea,
} from '@/shared/ui';

import {
  type AllowedAdjustmentType,
  type ApplyChangeFormValues,
  applyChangeSchema,
  type SetQuantityFormValues,
  setQuantitySchema,
} from '../schemas/inventory-adjustment.schema';
import type { InventoryRecord } from '../types';
import { InventoryQuickPresets } from './InventoryQuickPresets';

export interface InventoryAdjustmentDialogProps {
  error?: string | null;
  isWorking?: boolean;
  isOpen: boolean;
  onApplyChange: (values: {
    adjustmentType: AllowedAdjustmentType;
    quantityChange: number;
    reason: string;
  }) => Promise<void> | void;
  onCancel: () => void;
  onSetQuantity: (values: { finalQuantity: number; reason: string }) => Promise<void> | void;
  target: InventoryRecord | null;
}

const adjustmentTypes: Array<{
  value: AllowedAdjustmentType;
  label: string;
}> = [
  { value: 'stock_received', label: 'Receive stock (+)' },
  { value: 'manual_increase', label: 'Other increase (+)' },
  { value: 'manual_decrease', label: 'Other decrease (-)' },
  { value: 'damaged_or_expired', label: 'Record damaged/expired stock (-)' },
];

export function InventoryAdjustmentDialog({
  error: serverError = null,
  isWorking = false,
  isOpen,
  onApplyChange,
  onCancel,
  onSetQuantity,
  target,
}: InventoryAdjustmentDialogProps) {
  const [tab, setTab] = useState<'adjust' | 'set'>('adjust');
  const [clientError, setClientError] = useState<string | null>(null);

  const applyForm = useForm<ApplyChangeFormValues>({
    resolver: zodResolver(applyChangeSchema),
    defaultValues: {
      adjustmentType: 'stock_received',
      quantityChange: 1,
      reason: '',
    },
  });

  const setForm = useForm<SetQuantityFormValues>({
    resolver: zodResolver(setQuantitySchema),
    defaultValues: {
      finalQuantity: target?.currentQuantity ?? 0,
      reason: '',
    },
  });

  useEffect(() => {
    if (target) {
      applyForm.reset({
        adjustmentType: 'stock_received',
        quantityChange: 1,
        reason: '',
      });
      setForm.reset({
        finalQuantity: target.currentQuantity,
        reason: '',
      });
      setClientError(null);
    }
  }, [target, applyForm, setForm]);

  async function handleApplySubmit(values: ApplyChangeFormValues) {
    setClientError(null);
    await onApplyChange(values);
  }

  async function handleSetSubmit(values: SetQuantityFormValues) {
    setClientError(null);
    if (target && values.finalQuantity === target.currentQuantity) {
      setClientError(
        'Set Quantity must differ from the current quantity. No inventory entry was created.',
      );
      return;
    }
    await onSetQuantity(values);
  }

  const activeError = clientError || serverError;

  return (
    <KisokDialog
      onOpenChange={(next) => {
        if (!(next || isWorking)) onCancel();
      }}
      open={isOpen && Boolean(target)}
    >
      <KisokDialogContent className="max-w-md">
        <KisokDialogHeader>
          <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
            Inventory control
          </p>
          <KisokDialogTitle>Adjust stock: {target?.productName}</KisokDialogTitle>
          <KisokDialogDescription>
            {target?.variantName ? `${target.variantName} · ` : ''}SKU: {target?.sku} · Current
            quantity: {target?.currentQuantity}
          </KisokDialogDescription>
        </KisokDialogHeader>

        <Tabs onValueChange={(val) => setTab(val as 'adjust' | 'set')} value={tab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="adjust">Apply change</TabsTrigger>
            <TabsTrigger value="set">Set final quantity</TabsTrigger>
          </TabsList>

          {/* TAB 1: Apply Change */}
          <TabsContent className="mt-4 space-y-4" value="adjust">
            <form id="apply-change-form" onSubmit={applyForm.handleSubmit(handleApplySubmit)}>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <label
                    className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]"
                    htmlFor="adjustment-type"
                  >
                    Adjustment type
                  </label>
                  <Select
                    onValueChange={(val) =>
                      applyForm.setValue('adjustmentType', val as AllowedAdjustmentType)
                    }
                    value={applyForm.watch('adjustmentType')}
                  >
                    <SelectTrigger className="w-full" id="adjustment-type">
                      <SelectValue placeholder="Select adjustment type">
                        {(val: string | null) => {
                          if (!val) return 'Select adjustment type';
                          const found = adjustmentTypes.find((t) => t.value === val);
                          return found ? found.label : val;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {adjustmentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <label
                    className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]"
                    htmlFor="inventory-quantity"
                  >
                    Quantity
                  </label>
                  <KisokInput
                    aria-describedby={
                      applyForm.formState.errors.quantityChange
                        ? 'inventory-quantity-error'
                        : undefined
                    }
                    aria-invalid={Boolean(applyForm.formState.errors.quantityChange)}
                    id="inventory-quantity"
                    inputMode="numeric"
                    min="1"
                    type="number"
                    {...applyForm.register('quantityChange', { valueAsNumber: true })}
                  />
                  <InventoryQuickPresets
                    disabled={isWorking}
                    onSelect={(amount) => {
                      const current = applyForm.getValues('quantityChange') || 0;
                      applyForm.setValue('quantityChange', current + amount, {
                        shouldValidate: true,
                      });
                    }}
                  />
                  {applyForm.formState.errors.quantityChange ? (
                    <p
                      className="text-destructive text-xs"
                      id="inventory-quantity-error"
                      role="alert"
                    >
                      {applyForm.formState.errors.quantityChange.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <label
                    className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]"
                    htmlFor="inventory-reason"
                  >
                    Reason
                  </label>
                  <KisokTextarea
                    aria-describedby={
                      applyForm.formState.errors.reason ? 'inventory-reason-error' : undefined
                    }
                    aria-invalid={Boolean(applyForm.formState.errors.reason)}
                    className="min-h-20 resize-y"
                    id="inventory-reason"
                    placeholder="Explain why stock changed (e.g. supplier delivery, broken unit)"
                    {...applyForm.register('reason')}
                  />
                  {applyForm.formState.errors.reason ? (
                    <p
                      className="text-destructive text-xs"
                      id="inventory-reason-error"
                      role="alert"
                    >
                      {applyForm.formState.errors.reason.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </form>
          </TabsContent>

          {/* TAB 2: Set Final Quantity */}
          <TabsContent className="mt-4 space-y-4" value="set">
            <form id="set-quantity-form" onSubmit={setForm.handleSubmit(handleSetSubmit)}>
              <div className="space-y-4">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  This records the calculated difference directly into the inventory audit log.
                </p>

                <div className="grid gap-2">
                  <label
                    className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]"
                    htmlFor="inventory-final-quantity"
                  >
                    Final quantity
                  </label>
                  <KisokInput
                    aria-describedby={
                      setForm.formState.errors.finalQuantity
                        ? 'inventory-final-quantity-error'
                        : undefined
                    }
                    aria-invalid={Boolean(setForm.formState.errors.finalQuantity)}
                    id="inventory-final-quantity"
                    inputMode="numeric"
                    min="0"
                    type="number"
                    {...setForm.register('finalQuantity', { valueAsNumber: true })}
                  />
                  {setForm.formState.errors.finalQuantity ? (
                    <p
                      className="text-destructive text-xs"
                      id="inventory-final-quantity-error"
                      role="alert"
                    >
                      {setForm.formState.errors.finalQuantity.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <label
                    className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]"
                    htmlFor="inventory-set-reason"
                  >
                    Reason
                  </label>
                  <KisokTextarea
                    aria-describedby={
                      setForm.formState.errors.reason ? 'inventory-set-reason-error' : undefined
                    }
                    aria-invalid={Boolean(setForm.formState.errors.reason)}
                    className="min-h-20 resize-y"
                    id="inventory-set-reason"
                    placeholder="Reason for count correction (e.g. physical recount, audit)"
                    {...setForm.register('reason')}
                  />
                  {setForm.formState.errors.reason ? (
                    <p
                      className="text-destructive text-xs"
                      id="inventory-set-reason-error"
                      role="alert"
                    >
                      {setForm.formState.errors.reason.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </form>
          </TabsContent>
        </Tabs>

        {activeError ? (
          <div
            className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive text-xs"
            role="alert"
          >
            {activeError}
          </div>
        ) : null}

        <KisokDialogFooter>
          <KisokButton disabled={isWorking} onClick={onCancel} type="button" variant="quiet">
            Cancel
          </KisokButton>
          <KisokButton
            disabled={isWorking}
            form={tab === 'adjust' ? 'apply-change-form' : 'set-quantity-form'}
            type="submit"
          >
            {isWorking ? 'Applying…' : tab === 'adjust' ? 'Save adjustment' : 'Save quantity'}
          </KisokButton>
        </KisokDialogFooter>
      </KisokDialogContent>
    </KisokDialog>
  );
}
