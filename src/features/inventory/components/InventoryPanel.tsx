'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { XIcon } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { InventoryAdjustmentInput } from '@/infrastructure/supabase/inventory/adapter';
import { KisokButton, KisokInput } from '@/shared/ui';

import { inventoryRepository } from '../repositories';
import { toSignedInventoryDelta } from '../schemas/inventory-adjustment.schema';
import type { InventoryHistoryRecord, InventoryRecord } from '../types';
import { downloadCsv, generateHistoryCsv, generateStockCsv } from '../utils/inventory-export';
import { InventoryAdjustmentDialog } from './InventoryAdjustmentDialog';
import { InventoryExportAction } from './InventoryExportAction';
import { type HistoryFilterType, InventoryHistoryFilter } from './InventoryHistoryFilter';
import { InventoryHistoryTable } from './InventoryHistoryTable';
import { InventoryKpiSummary } from './InventoryKpiSummary';
import { InventoryStockTable } from './InventoryStockTable';

const ITEMS_PER_PAGE = 15;

export function InventoryPanel() {
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');
  const [inventoryRows, setInventoryRows] = useState<InventoryRecord[]>([]);
  const [historyRows, setHistoryRows] = useState<InventoryHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Stock table state
  const [stockSearch, setStockSearch] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [stockPage, setStockPage] = useState(1);

  // History table state
  const [historySearch, setHistorySearch] = useState('');
  const [historyType, setHistoryType] = useState<HistoryFilterType>('all');
  const [historyPage, setHistoryPage] = useState(1);

  // Modal Dialog state
  const [dialogTarget, setDialogTarget] = useState<InventoryRecord | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const fetchStock = useCallback(async () => {
    try {
      const rows = await inventoryRepository.list();
      setInventoryRows(rows);
    } catch {
      setError('Inventory could not be loaded. Check connection and try again.');
    }
  }, []);

  const fetchHistory = useCallback(async (searchQuery = '') => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const rows = await inventoryRepository.listHistory(searchQuery);
      setHistoryRows(rows);
    } catch {
      setHistoryError('Adjustment history could not be loaded. Check connection and try again.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchStock(), fetchHistory(historySearch)]);
    } finally {
      setLoading(false);
    }
  }, [fetchStock, fetchHistory, historySearch]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  // Debounced search for history
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchHistory(historySearch);
      setHistoryPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [historySearch, fetchHistory]);

  // Auto-dismiss success message after 4s
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // Filtered Stock rows
  const filteredStockRows = useMemo(() => {
    const query = stockSearch.trim().toLowerCase();
    return inventoryRows.filter((row) => {
      if (onlyLowStock && !row.isLowStock) return false;
      if (!query) return true;
      const nameMatch = row.productName.toLowerCase().includes(query);
      const variantMatch = row.variantName?.toLowerCase().includes(query);
      const skuMatch = row.sku.toLowerCase().includes(query);
      const barcodeMatch = row.barcode?.toLowerCase().includes(query);
      return nameMatch || variantMatch || skuMatch || barcodeMatch;
    });
  }, [inventoryRows, stockSearch, onlyLowStock]);

  // Paginated Stock rows
  const paginatedStockRows = useMemo(() => {
    const startIndex = (stockPage - 1) * ITEMS_PER_PAGE;
    return filteredStockRows.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredStockRows, stockPage]);

  // Filtered History rows
  const filteredHistoryRows = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    return historyRows.filter((row) => {
      if (historyType !== 'all' && row.type !== historyType) {
        return false;
      }
      if (!query) return true;
      const reasonMatch = row.reason?.toLowerCase().includes(query);
      const nameMatch = row.productName.toLowerCase().includes(query);
      const variantMatch = row.variantName?.toLowerCase().includes(query);
      const skuMatch = row.sku.toLowerCase().includes(query);
      return reasonMatch || nameMatch || variantMatch || skuMatch;
    });
  }, [historyRows, historySearch, historyType]);

  // Paginated History rows
  const paginatedHistoryRows = useMemo(() => {
    const startIndex = (historyPage - 1) * ITEMS_PER_PAGE;
    return filteredHistoryRows.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredHistoryRows, historyPage]);

  function handleExportStock() {
    const csv = generateStockCsv(filteredStockRows);
    downloadCsv('kiosk-inventory-stock.csv', csv);
  }

  function handleExportHistory() {
    const csv = generateHistoryCsv(filteredHistoryRows);
    downloadCsv('kiosk-inventory-history.csv', csv);
  }

  async function handleApplyChange(values: {
    adjustmentType: InventoryAdjustmentInput['adjustmentType'];
    quantityChange: number;
    reason: string;
  }) {
    if (!dialogTarget) return;
    setIsWorking(true);
    setDialogError(null);
    try {
      const signedDelta = toSignedInventoryDelta(values.adjustmentType, values.quantityChange);
      await inventoryRepository.applyAdjustment({
        variantId: dialogTarget.variantId,
        adjustmentType: values.adjustmentType,
        quantityChange: signedDelta,
        reason: values.reason,
      });
      setDialogTarget(null);
      setSuccessMessage('Inventory updated and audit history recorded.');
      await refreshAll();
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : typeof caught === 'object' && caught && 'message' in caught
            ? String((caught as { message: unknown }).message)
            : 'The inventory adjustment was rejected. Check your input and try again.';
      setDialogError(message);
    } finally {
      setIsWorking(false);
    }
  }

  async function handleSetQuantity(values: { finalQuantity: number; reason: string }) {
    if (!dialogTarget) return;
    setIsWorking(true);
    setDialogError(null);
    try {
      await inventoryRepository.setQuantity({
        variantId: dialogTarget.variantId,
        finalQuantity: values.finalQuantity,
        reason: values.reason,
      });
      setDialogTarget(null);
      setSuccessMessage('Inventory quantity updated and audit history recorded.');
      await refreshAll();
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : typeof caught === 'object' && caught && 'message' in caught
            ? String((caught as { message: unknown }).message)
            : 'The final quantity was rejected. Check your input and try again.';
      setDialogError(message);
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-card/90 p-4 text-card-foreground shadow-panel sm:p-7">
      {/* Toast Notification */}
      {successMessage ? (
        <aside
          aria-live="polite"
          className="fixed top-6 right-6 z-50 flex max-w-[calc(100vw-3rem)] items-center gap-3 rounded-xl border border-success/35 bg-card px-4 py-3 shadow-overlay ring-1 ring-success/15 backdrop-blur-md motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4"
          role="status"
        >
          <span className="flex size-2.5 rounded-full bg-success motion-safe:animate-pulse" />
          <p className="font-medium text-foreground text-sm">{successMessage}</p>
          <button
            aria-label="Close notification"
            className="ml-2 font-bold text-muted-foreground hover:text-foreground text-xs"
            onClick={() => setSuccessMessage(null)}
            type="button"
          >
            <XIcon aria-hidden="true" className="size-4" />
          </button>
        </aside>
      ) : null}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
            Inventory management / Lean V2
          </p>
          <h1 className="mt-2 text-balance font-black text-4xl tracking-[-0.05em] sm:text-5xl">
            Stock control
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <InventoryExportAction
            activeTab={activeTab}
            disabled={loading}
            onExportHistory={handleExportHistory}
            onExportStock={handleExportStock}
          />
        </div>
      </div>

      {/* KPI Summary Metrics */}
      <InventoryKpiSummary rows={inventoryRows} />

      {/* Tabs */}
      <Tabs onValueChange={(v) => setActiveTab(v as 'stock' | 'history')} value={activeTab}>
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="stock">Current stock</TabsTrigger>
          <TabsTrigger value="history">Adjustment history</TabsTrigger>
        </TabsList>

        {/* TAB 1: Current Stock */}
        <TabsContent className="mt-6 space-y-4" value="stock">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-xs">
              <KisokInput
                aria-label="Search stock"
                onChange={(e) => {
                  setStockSearch(e.target.value);
                  setStockPage(1);
                }}
                placeholder="Search by product, SKU, or barcode…"
                value={stockSearch}
              />
            </div>
            <KisokButton
              className={
                onlyLowStock ? 'border-destructive bg-destructive/10 text-destructive' : ''
              }
              onClick={() => {
                setOnlyLowStock((prev) => !prev);
                setStockPage(1);
              }}
              size="sm"
              variant={onlyLowStock ? 'outline' : 'quiet'}
            >
              {onlyLowStock ? 'Showing low stock only' : 'Filter low stock'}
            </KisokButton>
          </div>

          {loading ? (
            <p className="py-12 text-center text-muted-foreground text-sm" role="status">
              Loading inventory stock…
            </p>
          ) : error ? (
            <div className="grid gap-3 py-6" role="alert">
              <p className="text-destructive text-sm">{error}</p>
              <KisokButton onClick={() => void refreshAll()} variant="outline">
                Try again
              </KisokButton>
            </div>
          ) : (
            <InventoryStockTable
              currentPage={stockPage}
              isFiltered={Boolean(stockSearch.trim() || onlyLowStock)}
              itemsPerPage={ITEMS_PER_PAGE}
              onAdjust={(row) => {
                setDialogError(null);
                setDialogTarget(row);
              }}
              onClearFilters={() => {
                setStockSearch('');
                setOnlyLowStock(false);
                setStockPage(1);
              }}
              onPageChange={setStockPage}
              rows={paginatedStockRows}
              totalItems={filteredStockRows.length}
            />
          )}
        </TabsContent>

        {/* TAB 2: Adjustment History */}
        <TabsContent className="mt-6 space-y-4" value="history">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-xs">
              <KisokInput
                aria-label="Search adjustment history"
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  setHistoryPage(1);
                }}
                placeholder="Search by reason or product…"
                value={historySearch}
              />
            </div>
            <InventoryHistoryFilter
              onTypeChange={(type) => {
                setHistoryType(type);
                setHistoryPage(1);
              }}
              selectedType={historyType}
            />
          </div>

          <InventoryHistoryTable
            currentPage={historyPage}
            error={historyError}
            isLoading={historyLoading && historyRows.length === 0}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setHistoryPage}
            onRetry={() => void fetchHistory(historySearch)}
            rows={paginatedHistoryRows}
            totalItems={filteredHistoryRows.length}
          />
        </TabsContent>
      </Tabs>

      {/* Unified Adjustment Modal */}
      <InventoryAdjustmentDialog
        error={dialogError}
        isOpen={Boolean(dialogTarget)}
        isWorking={isWorking}
        onApplyChange={handleApplyChange}
        onCancel={() => {
          if (!isWorking) setDialogTarget(null);
        }}
        onSetQuantity={handleSetQuantity}
        target={dialogTarget}
      />
    </section>
  );
}
