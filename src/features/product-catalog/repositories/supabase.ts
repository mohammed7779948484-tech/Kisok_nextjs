import type { SupabaseClient } from '@supabase/supabase-js';

import { getBrowserSupabaseClient } from '@/infrastructure/supabase/client/browser-client';
import type { Database } from '@/infrastructure/supabase/database.types';
import { resolveLowStockThreshold } from '@/lib/utils/inventory/low-stock-threshold';

import type {
  ProductCatalogDataContract,
  ProductInput,
  ProductRecord,
  ProductStockStatus,
  ProductUpdate,
  ProductWriteResult,
  VariantInput,
  VariantOptionSelection,
  VariantOptionValueRecord,
  VariantRecord,
  VariantUpdate,
} from '../types';

const ORDER_METHOD = 'order' as const;

type ProductListRow = {
  id: string;
  name: string;
  brand_id: string | null;
  short_description: string | null;
  is_active: boolean;
  is_featured: boolean;
  brands: { name: string } | null;
  product_variants: Array<{
    is_active: boolean;
    low_stock_threshold: number | null;
    inventory: Array<{ current_quantity: number }>;
  }>;
};

function getClientOrThrow(): SupabaseClient<Database> {
  const client = getBrowserSupabaseClient();
  if (!client) throw new Error('Supabase is not configured for Product Catalog.');
  return client;
}

function mapVariant(row: Database['public']['Tables']['product_variants']['Row']): VariantRecord {
  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    barcode: row.barcode,
    titleOverride: row.title_override,
    isActive: row.is_active,
    lowStockThreshold: row.low_stock_threshold,
  };
}

function mapProduct(row: Database['public']['Tables']['products']['Row']): ProductWriteResult {
  return {
    id: row.id,
    name: row.name,
    brandId: row.brand_id,
    shortDescription: row.short_description,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    coverMediaAssetId: row.cover_media_asset_id,
  };
}

function mapVariantOptionValue(row: {
  option_type_id: string;
  option_value_id: string;
  option_types: { name: string } | null;
  option_values: { value: string } | null;
}): VariantOptionValueRecord {
  return {
    optionTypeId: row.option_type_id,
    optionTypeName: row.option_types?.name ?? '',
    optionValueId: row.option_value_id,
    optionValueName: row.option_values?.value ?? '',
  };
}

/**
 * Mirrors Inventory/Dashboard: a Product is "Low stock" when any of its
 * active Variants is at or below its effective threshold (variant override,
 * falling back to the store-wide default) — never a hardcoded cutoff.
 */
function getStockStatus(availableStock: number, isLowStock: boolean): ProductStockStatus {
  if (availableStock <= 0) return 'Out of stock';
  if (isLowStock) return 'Low stock';
  return 'In stock';
}

export function createProductCatalogRepository(
  client: SupabaseClient<Database>,
): ProductCatalogDataContract {
  return {
    async createVariant(input: VariantInput) {
      const payload: Database['public']['Tables']['product_variants']['Insert'] = {
        product_id: input.productId,
      };
      if (input.barcode !== undefined) payload.barcode = input.barcode?.trim() || null;
      if (input.titleOverride !== undefined)
        payload.title_override = input.titleOverride?.trim() || null;
      if (input.lowStockThreshold !== undefined)
        payload.low_stock_threshold = input.lowStockThreshold;

      const result = await client
        .from('product_variants')
        .insert(payload)
        .select(
          'id,product_id,sku,barcode,title_override,is_active,low_stock_threshold,display_order,search_keywords,created_at,updated_at',
        )
        .single();
      if (result.error) throw result.error;
      return mapVariant(result.data);
    },

    async listVariants(productId: string) {
      const result = await client
        .from('product_variants')
        .select(
          'id,product_id,sku,barcode,title_override,is_active,low_stock_threshold,display_order,search_keywords,created_at,updated_at',
        )
        .eq('product_id', productId)
        [ORDER_METHOD]('display_order', { ascending: true });
      if (result.error) throw result.error;
      return (result.data ?? []).map(mapVariant);
    },

    async updateVariant(id: string, input: VariantUpdate) {
      const payload: Database['public']['Tables']['product_variants']['Update'] = {};
      if (input.barcode !== undefined) payload.barcode = input.barcode?.trim() || null;
      if (input.titleOverride !== undefined)
        payload.title_override = input.titleOverride?.trim() || null;
      if (input.lowStockThreshold !== undefined)
        payload.low_stock_threshold = input.lowStockThreshold;
      if (input.isActive !== undefined) payload.is_active = input.isActive;
      const result = await client
        .from('product_variants')
        .update(payload)
        .eq('id', id)
        .select(
          'id,product_id,sku,barcode,title_override,is_active,low_stock_threshold,display_order,search_keywords,created_at,updated_at',
        )
        .single();
      if (result.error) throw result.error;
      return mapVariant(result.data);
    },

    async listVariantOptionValues(variantId: string) {
      const result = await client
        .from('variant_option_values')
        .select('option_type_id,option_value_id,option_types(name),option_values(value)')
        .eq('variant_id', variantId);
      if (result.error) throw result.error;
      return (result.data ?? []).map((row) => mapVariantOptionValue(row as never));
    },

    async replaceVariantOptionValues(variantId: string, selections: VariantOptionSelection[]) {
      const uniqueTypeIds = new Set(selections.map((selection) => selection.optionTypeId));
      if (uniqueTypeIds.size !== selections.length) {
        throw new Error('A Variant can have at most one Value per Option Type.');
      }

      const existingResult = await client
        .from('variant_option_values')
        .select('option_type_id,option_value_id')
        .eq('variant_id', variantId);
      if (existingResult.error) throw existingResult.error;

      const existingByType = new Map(
        (existingResult.data ?? []).map((row) => [row.option_type_id, row.option_value_id]),
      );
      const nextTypeIds = new Set(selections.map((selection) => selection.optionTypeId));

      const toInsert = selections.filter(
        (selection) => !existingByType.has(selection.optionTypeId),
      );
      const toUpdate = selections.filter((selection) => {
        const currentValueId = existingByType.get(selection.optionTypeId);
        return currentValueId !== undefined && currentValueId !== selection.optionValueId;
      });
      const toRemoveTypeIds = [...existingByType.keys()].filter(
        (optionTypeId) => !nextTypeIds.has(optionTypeId),
      );

      // Diff-based, never delete-then-insert: additions/changes apply first,
      // so a failure here leaves every prior Option Type/Value untouched
      // instead of wiping the whole combination like a blind DELETE would.
      //
      // PostgREST gives no cross-statement transaction here, so true
      // atomicity is approximated with a compensating-rollback (saga):
      // every successful step is tracked, and if ANY later step fails —
      // insert, update, or delete — every tracked step is undone before the
      // original error is rethrown. This guarantees the Variant ends up
      // either fully at the intended new combination or fully back at its
      // original one; it must never be left half-migrated.
      const appliedInserts: VariantOptionSelection[] = [];
      const appliedUpdates: Array<{ optionTypeId: string; previousValueId: string }> = [];
      const appliedRemovals: Array<{ optionTypeId: string; previousValueId: string }> = [];

      async function rollback(): Promise<void> {
        for (const removal of [...appliedRemovals].reverse()) {
          const result = await client.from('variant_option_values').insert({
            variant_id: variantId,
            option_type_id: removal.optionTypeId,
            option_value_id: removal.previousValueId,
          });
          if (result.error) throw result.error;
        }
        for (const update of [...appliedUpdates].reverse()) {
          const result = await client
            .from('variant_option_values')
            .update({ option_value_id: update.previousValueId })
            .eq('variant_id', variantId)
            .eq('option_type_id', update.optionTypeId);
          if (result.error) throw result.error;
        }
        for (const inserted of [...appliedInserts].reverse()) {
          const result = await client
            .from('variant_option_values')
            .delete()
            .eq('variant_id', variantId)
            .eq('option_type_id', inserted.optionTypeId);
          if (result.error) throw result.error;
        }
      }

      try {
        if (toInsert.length > 0) {
          const insertResult = await client.from('variant_option_values').insert(
            toInsert.map((selection) => ({
              variant_id: variantId,
              option_type_id: selection.optionTypeId,
              option_value_id: selection.optionValueId,
            })),
          );
          if (insertResult.error) throw insertResult.error;
          appliedInserts.push(...toInsert);
        }

        for (const selection of toUpdate) {
          const updateResult = await client
            .from('variant_option_values')
            .update({ option_value_id: selection.optionValueId })
            .eq('variant_id', variantId)
            .eq('option_type_id', selection.optionTypeId);
          if (updateResult.error) throw updateResult.error;
          const previousValueId = existingByType.get(selection.optionTypeId);
          if (previousValueId !== undefined) {
            appliedUpdates.push({ optionTypeId: selection.optionTypeId, previousValueId });
          }
        }

        // Only drop Option Types explicitly removed from the new selection —
        // never as a side effect of an insert/update failure elsewhere above.
        for (const optionTypeId of toRemoveTypeIds) {
          const deleteResult = await client
            .from('variant_option_values')
            .delete()
            .eq('variant_id', variantId)
            .eq('option_type_id', optionTypeId);
          if (deleteResult.error) throw deleteResult.error;
          const previousValueId = existingByType.get(optionTypeId);
          if (previousValueId !== undefined) {
            appliedRemovals.push({ optionTypeId, previousValueId });
          }
        }
      } catch (error) {
        try {
          await rollback();
        } catch (rollbackError) {
          const originalMessage = error instanceof Error ? error.message : String(error);
          const rollbackMessage =
            rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
          throw new Error(
            `Variant Option replacement failed (${originalMessage}) and automatic rollback also ` +
              `failed (${rollbackMessage}). This Variant's Option combination may be in a partial, ` +
              'unintended state and requires manual review.',
          );
        }
        throw error;
      }
    },

    async createProduct(input: ProductInput) {
      const result = await client
        .from('products')
        .insert({
          name: input.name.trim(),
          brand_id: input.brandId ?? null,
          short_description: input.shortDescription?.trim() || null,
          is_featured: input.isFeatured ?? false,
        })
        .select(
          'id,name,brand_id,short_description,is_active,is_featured,cover_media_asset_id,display_order,search_keywords,created_at,updated_at',
        )
        .single();
      if (result.error) throw result.error;

      const categoryIds = [...new Set(input.categoryIds ?? [])];
      if (categoryIds.length > 0) {
        const relationResult = await client.from('product_categories').insert(
          categoryIds.map((categoryId) => ({
            product_id: result.data.id,
            category_id: categoryId,
          })),
        );
        if (relationResult.error) {
          await client.from('products').delete().eq('id', result.data.id);
          throw relationResult.error;
        }
      }

      return mapProduct(result.data);
    },

    async updateProduct(id: string, input: ProductUpdate) {
      const payload: Database['public']['Tables']['products']['Update'] = {};
      if (input.name !== undefined) payload.name = input.name.trim();
      if (input.brandId !== undefined) payload.brand_id = input.brandId;
      if (input.shortDescription !== undefined)
        payload.short_description = input.shortDescription?.trim() || null;
      if (input.isFeatured !== undefined) payload.is_featured = input.isFeatured;
      if (input.isActive !== undefined) payload.is_active = input.isActive;
      if (input.coverMediaAssetId !== undefined)
        payload.cover_media_asset_id = input.coverMediaAssetId;

      const result = await client
        .from('products')
        .update(payload)
        .eq('id', id)
        .select(
          'id,name,brand_id,short_description,is_active,is_featured,cover_media_asset_id,display_order,search_keywords,created_at,updated_at',
        )
        .single();
      if (result.error) throw result.error;
      return mapProduct(result.data);
    },

    async listProductCategoryIds(productId: string) {
      const result = await client
        .from('product_categories')
        .select('category_id')
        .eq('product_id', productId);
      if (result.error) throw result.error;
      return (result.data ?? []).map((row) => row.category_id);
    },

    // Direct diff-based insert/delete on the join table — Lean V2 keeps this
    // relation ranking-free (see the schema comment on `product_categories`),
    // so there is no ordering/primary-category invariant a transactional RPC
    // would need to protect. Unlike `replaceVariantOptionValues`, a partial
    // failure here just leaves some Categories unchanged; it never corrupts
    // a required combination, so no compensating rollback is warranted.
    async setProductCategories(productId: string, categoryIds: string[]) {
      const desired = new Set(categoryIds);
      const existingResult = await client
        .from('product_categories')
        .select('category_id')
        .eq('product_id', productId);
      if (existingResult.error) throw existingResult.error;
      const existing = new Set((existingResult.data ?? []).map((row) => row.category_id));

      const toRemove = [...existing].filter((categoryId) => !desired.has(categoryId));
      const toAdd = [...desired].filter((categoryId) => !existing.has(categoryId));

      if (toRemove.length > 0) {
        const deleteResult = await client
          .from('product_categories')
          .delete()
          .eq('product_id', productId)
          .in('category_id', toRemove);
        if (deleteResult.error) throw deleteResult.error;
      }

      if (toAdd.length > 0) {
        const insertResult = await client.from('product_categories').insert(
          toAdd.map((categoryId) => ({
            product_id: productId,
            category_id: categoryId,
          })),
        );
        if (insertResult.error) throw insertResult.error;
      }
    },

    async listProducts(): Promise<ProductRecord[]> {
      const settingsResult = await client
        .from('store_settings')
        .select('global_low_stock_threshold')
        .maybeSingle();
      if (settingsResult.error) throw settingsResult.error;
      const globalThreshold = settingsResult.data?.global_low_stock_threshold ?? 0;

      const result = await client
        .from('products')
        .select(
          'id,name,brand_id,short_description,is_active,is_featured,brands(name),product_variants(id,is_active,low_stock_threshold,inventory(current_quantity))',
        )
        [ORDER_METHOD]('display_order', { ascending: true });
      if (result.error) throw result.error;

      return ((result.data ?? []) as unknown as ProductListRow[]).map((product) => {
        // Mirrors the Dashboard projection: a deactivated/discontinued
        // Variant's leftover (or zero) stock must never affect the
        // Product's operational stock status.
        const activeVariants = product.product_variants.filter((variant) => variant.is_active);
        const availableStock = activeVariants.reduce(
          (total, variant) => total + (variant.inventory[0]?.current_quantity ?? 0),
          0,
        );
        const isLowStock = activeVariants.some((variant) => {
          const quantity = variant.inventory[0]?.current_quantity ?? 0;
          const threshold = resolveLowStockThreshold(variant.low_stock_threshold, globalThreshold);
          return quantity <= threshold;
        });
        return {
          id: product.id,
          name: product.name,
          brandId: product.brand_id,
          brandName: product.brands?.name ?? null,
          shortDescription: product.short_description,
          variantCount: activeVariants.length,
          availableStock,
          status: getStockStatus(availableStock, isLowStock),
          isActive: product.is_active,
          isFeatured: product.is_featured,
        };
      });
    },
  };
}

export const productCatalogRepository: ProductCatalogDataContract = {
  createVariant(input) {
    return createProductCatalogRepository(getClientOrThrow()).createVariant(input);
  },
  listVariants(productId) {
    return createProductCatalogRepository(getClientOrThrow()).listVariants(productId);
  },
  updateVariant(id, input) {
    return createProductCatalogRepository(getClientOrThrow()).updateVariant(id, input);
  },
  listVariantOptionValues(variantId) {
    return createProductCatalogRepository(getClientOrThrow()).listVariantOptionValues(variantId);
  },
  replaceVariantOptionValues(variantId, selections) {
    return createProductCatalogRepository(getClientOrThrow()).replaceVariantOptionValues(
      variantId,
      selections,
    );
  },
  listProducts() {
    return createProductCatalogRepository(getClientOrThrow()).listProducts();
  },
  createProduct(input) {
    return createProductCatalogRepository(getClientOrThrow()).createProduct(input);
  },
  updateProduct(id, input) {
    return createProductCatalogRepository(getClientOrThrow()).updateProduct(id, input);
  },
  listProductCategoryIds(productId) {
    return createProductCatalogRepository(getClientOrThrow()).listProductCategoryIds(productId);
  },
  setProductCategories(productId, categoryIds) {
    return createProductCatalogRepository(getClientOrThrow()).setProductCategories(
      productId,
      categoryIds,
    );
  },
};
