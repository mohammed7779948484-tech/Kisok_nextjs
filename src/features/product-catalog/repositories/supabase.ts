import type { SupabaseClient } from '@supabase/supabase-js';

import { getBrowserSupabaseClient } from '@/infrastructure/supabase/client/browser-client';
import type { Database } from '@/infrastructure/supabase/database.types';

import type {
  ProductCatalogDataContract,
  ProductInput,
  ProductRecord,
  ProductStockStatus,
  VariantInput,
  VariantRecord,
  VariantUpdate,
} from '../types';

type ProductListRow = {
  id: string;
  name: string;
  is_active: boolean;
  is_featured: boolean;
  brands: { name: string } | null;
  product_variants: Array<{ inventory: Array<{ current_quantity: number }> }>;
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

function mapProduct(row: Database['public']['Tables']['products']['Row']) {
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

function getStockStatus(stock: number): ProductStockStatus {
  if (stock <= 0) return 'Out of stock';
  if (stock <= 5) return 'Low stock';
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
        .order('display_order', { ascending: true });
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

    async listProducts(): Promise<ProductRecord[]> {
      const result = await client
        .from('products')
        .select(
          'id,name,is_active,is_featured,brands(name),product_variants(id,inventory(current_quantity))',
        )
        .order('display_order', { ascending: true });
      if (result.error) throw result.error;

      return ((result.data ?? []) as unknown as ProductListRow[]).map((product) => {
        const availableStock = product.product_variants.reduce(
          (total, variant) => total + (variant.inventory[0]?.current_quantity ?? 0),
          0,
        );
        return {
          id: product.id,
          name: product.name,
          brandName: product.brands?.name ?? null,
          variantCount: product.product_variants.length,
          availableStock,
          status: getStockStatus(availableStock),
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
  listProducts() {
    return createProductCatalogRepository(getClientOrThrow()).listProducts();
  },
  createProduct(input) {
    return createProductCatalogRepository(getClientOrThrow()).createProduct(input);
  },
};
