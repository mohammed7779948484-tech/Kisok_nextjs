'use client';

import { useCallback, useEffect, useState } from 'react';

import { catalogTaxonomyRepository } from '@/features/catalog-taxonomy/repositories';
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
  StatusPill,
} from '@/shared/ui';

import { productCatalogRepository } from '../repositories';
import type { ProductRecord, VariantRecord } from '../types';

export function ProductCatalogPanel() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [productName, setProductName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; parentId: string | null }>
  >([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [variantProduct, setVariantProduct] = useState<ProductRecord | null>(null);
  const [variants, setVariants] = useState<VariantRecord[]>([]);
  const [variantCreateOpen, setVariantCreateOpen] = useState(false);
  const [variantTitle, setVariantTitle] = useState('');
  const [variantBarcode, setVariantBarcode] = useState('');
  const [variantThreshold, setVariantThreshold] = useState('5');
  const [variantLoading, setVariantLoading] = useState(false);
  const [variantSaving, setVariantSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productRows, brandRows, categoryRows] = await Promise.all([
        productCatalogRepository.listProducts(),
        catalogTaxonomyRepository.listBrands(),
        catalogTaxonomyRepository.listCategories(),
      ]);
      setProducts(productRows);
      setBrands((brandRows ?? []).map((brand) => ({ id: brand.id, name: brand.name })));
      setCategories(
        (categoryRows ?? []).map((category) => ({
          id: category.id,
          name: category.name,
          parentId: category.parentId,
        })),
      );
    } catch {
      setError('Products could not be loaded. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function openVariantManager(product: ProductRecord) {
    setVariantProduct(product);
    setVariantLoading(true);
    setError(null);
    try {
      setVariants(await productCatalogRepository.listVariants(product.id));
    } catch {
      setError(`Variants for ${product.name} could not be loaded.`);
    } finally {
      setVariantLoading(false);
    }
  }

  async function createVariant() {
    if (!variantProduct) return;
    setVariantSaving(true);
    setError(null);
    try {
      await productCatalogRepository.createVariant({
        productId: variantProduct.id,
        ...(variantTitle.trim() ? { titleOverride: variantTitle.trim() } : {}),
        ...(variantBarcode.trim() ? { barcode: variantBarcode.trim() } : {}),
        lowStockThreshold: Number(variantThreshold),
      });
      setVariantTitle('');
      setVariantBarcode('');
      setVariantThreshold('5');
      setVariantCreateOpen(false);
      setVariants(await productCatalogRepository.listVariants(variantProduct.id));
      await refresh();
    } catch {
      setError(`The Variant for ${variantProduct.name} could not be created.`);
    } finally {
      setVariantSaving(false);
    }
  }

  async function createProduct() {
    const name = productName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      await productCatalogRepository.createProduct({
        name,
        brandId: selectedBrandId || null,
        shortDescription: shortDescription.trim() || null,
        isFeatured,
        ...(selectedCategoryIds.length > 0 ? { categoryIds: selectedCategoryIds } : {}),
      });
      setProductName('');
      setShortDescription('');
      setIsFeatured(false);
      setSelectedBrandId('');
      setSelectedCategoryIds([]);
      setCreateOpen(false);
      await refresh();
    } catch {
      setError('The Product could not be created. Check for duplicate or invalid data.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="border border-border bg-card p-5 text-card-foreground sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
            Product catalog / hosted data
          </p>
          <h1 className="mt-2 font-black text-5xl tracking-[-0.08em] sm:text-6xl">
            Product catalog
          </h1>
        </div>
        <div className="flex gap-2">
          <KisokButton onClick={() => setCreateOpen(true)} variant="outline">
            New product
          </KisokButton>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Refresh
          </KisokButton>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-muted-foreground text-sm" role="status">
          Loading products…
        </p>
      ) : error ? (
        <div className="mt-6 grid gap-3" role="alert">
          <p className="text-destructive text-sm">{error}</p>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Try again
          </KisokButton>
        </div>
      ) : products.length === 0 ? (
        <p className="mt-6 text-muted-foreground text-sm">No products are available.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[680px] w-full text-left">
            <thead className="border-border border-b font-mono text-muted-foreground text-[10px] uppercase tracking-[0.17em]">
              <tr>
                <th className="pr-6 pb-3 font-medium">Product</th>
                <th className="pr-6 pb-3 font-medium">Brand</th>
                <th className="pr-6 pb-3 font-medium">Variants</th>
                <th className="pr-6 pb-3 font-medium">Available</th>
                <th className="pb-3 text-right font-medium">Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => (
                <tr className="group" key={product.id}>
                  <td className="py-5 pr-6 font-bold">{product.name}</td>
                  <td className="py-5 pr-6 text-muted-foreground text-sm">
                    {product.brandName ?? 'Unassigned'}
                  </td>
                  <td className="py-5 pr-6 font-mono text-muted-foreground text-sm">
                    {product.variantCount}
                  </td>
                  <td className="py-5 pr-6 font-mono text-sm">{product.availableStock}</td>
                  <td className="py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <KisokButton
                        aria-label={`Manage variants for ${product.name}`}
                        onClick={() => void openVariantManager(product)}
                        size="sm"
                        variant="quiet"
                      >
                        Variants
                      </KisokButton>
                      <StatusPill
                        className={
                          product.status === 'Out of stock'
                            ? 'border-destructive text-destructive'
                            : undefined
                        }
                      >
                        {product.status}
                      </StatusPill>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <KisokDialog
        onOpenChange={(open) => {
          if (!open) {
            setVariantProduct(null);
            setVariantCreateOpen(false);
          }
        }}
        open={variantProduct !== null}
      >
        <KisokDialogContent>
          <KisokDialogHeader>
            <KisokDialogTitle>Variants · {variantProduct?.name}</KisokDialogTitle>
            <KisokDialogDescription>
              Variant SKUs are generated by Lean V2. Maintain only operational identifiers and stock
              thresholds here.
            </KisokDialogDescription>
          </KisokDialogHeader>
          {variantLoading ? (
            <p className="text-muted-foreground text-sm" role="status">
              Loading variants…
            </p>
          ) : variants.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No variants are assigned to this Product.
            </p>
          ) : (
            <div className="divide-y divide-border border-border border-y">
              {variants.map((variant) => (
                <div className="flex items-center justify-between gap-3 py-3" key={variant.id}>
                  <div>
                    <p className="font-mono text-sm">{variant.sku}</p>
                    <p className="text-muted-foreground text-xs">
                      {variant.titleOverride ?? 'Default title'}
                    </p>
                  </div>
                  <StatusPill
                    className={variant.isActive ? undefined : 'border-destructive text-destructive'}
                  >
                    {variant.isActive ? 'Active' : 'Inactive'}
                  </StatusPill>
                </div>
              ))}
            </div>
          )}
          {variantCreateOpen ? (
            <div className="grid gap-3">
              <label className="grid gap-2" htmlFor="variant-title">
                <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                  Variant title
                </span>
                <KisokInput
                  id="variant-title"
                  onChange={(event) => setVariantTitle(event.target.value)}
                  value={variantTitle}
                />
              </label>
              <label className="grid gap-2" htmlFor="variant-barcode">
                <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                  Barcode
                </span>
                <KisokInput
                  id="variant-barcode"
                  onChange={(event) => setVariantBarcode(event.target.value)}
                  value={variantBarcode}
                />
              </label>
              <label className="grid gap-2" htmlFor="variant-threshold">
                <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                  Low-stock threshold
                </span>
                <KisokInput
                  id="variant-threshold"
                  inputMode="numeric"
                  onChange={(event) => setVariantThreshold(event.target.value)}
                  value={variantThreshold}
                />
              </label>
            </div>
          ) : null}
          <KisokDialogFooter>
            <KisokButton
              disabled={variantSaving}
              onClick={() => setVariantProduct(null)}
              variant="quiet"
            >
              Close
            </KisokButton>
            {variantCreateOpen ? (
              <KisokButton
                disabled={variantSaving || !variantProduct}
                onClick={() => void createVariant()}
              >
                {variantSaving ? 'Saving…' : 'Save variant'}
              </KisokButton>
            ) : (
              <KisokButton onClick={() => setVariantCreateOpen(true)}>Add variant</KisokButton>
            )}
          </KisokDialogFooter>
        </KisokDialogContent>
      </KisokDialog>

      <KisokDialog onOpenChange={setCreateOpen} open={createOpen}>
        <KisokDialogContent>
          <KisokDialogHeader>
            <KisokDialogTitle>New product</KisokDialogTitle>
            <KisokDialogDescription>
              Create a Product in the hosted catalog. This workspace stores operational catalog data
              only.
            </KisokDialogDescription>
          </KisokDialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-2" htmlFor="product-name">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Product name
              </span>
              <KisokInput
                id="product-name"
                onChange={(event) => setProductName(event.target.value)}
                value={productName}
              />
            </label>
            <label className="grid gap-2" htmlFor="product-brand">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Brand
              </span>
              <select
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                id="product-brand"
                onChange={(event) => setSelectedBrandId(event.target.value)}
                value={selectedBrandId}
              >
                <option value="">Unassigned</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="grid gap-2">
              <legend className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Categories
              </legend>
              <div className="grid gap-2">
                {categories.map((category) => (
                  <label className="flex items-center gap-2 text-sm" key={category.id}>
                    <input
                      aria-label={category.name}
                      checked={selectedCategoryIds.includes(category.id)}
                      onChange={(event) =>
                        setSelectedCategoryIds((current) =>
                          event.target.checked
                            ? [...current, category.id]
                            : current.filter((id) => id !== category.id),
                        )
                      }
                      type="checkbox"
                    />
                    <span>{category.parentId ? `↳ ${category.name}` : category.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="grid gap-2" htmlFor="product-description">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Description
              </span>
              <KisokTextarea
                id="product-description"
                onChange={(event) => setShortDescription(event.target.value)}
                value={shortDescription}
              />
            </label>
            <label className="flex items-center gap-2 text-sm" htmlFor="product-featured">
              <input
                checked={isFeatured}
                id="product-featured"
                onChange={(event) => setIsFeatured(event.target.checked)}
                type="checkbox"
              />
              Feature this product
            </label>
          </div>
          <KisokDialogFooter>
            <KisokButton disabled={creating} onClick={() => setCreateOpen(false)} variant="quiet">
              Cancel
            </KisokButton>
            <KisokButton
              disabled={creating || !productName.trim()}
              onClick={() => void createProduct()}
            >
              {creating ? 'Saving…' : 'Save product'}
            </KisokButton>
          </KisokDialogFooter>
        </KisokDialogContent>
      </KisokDialog>
    </section>
  );
}
