import type { SupabaseClient } from '@supabase/supabase-js';

import { getBrowserSupabaseClient } from '@/infrastructure/supabase/client/browser-client';
import type { Database } from '@/infrastructure/supabase/database.types';

import type { ProductCatalogDataContract, ProductRecord, ProductStockStatus } from '../types';

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

function getStockStatus(stock: number): ProductStockStatus {
  if (stock <= 0) return 'Out of stock';
  if (stock <= 5) return 'Low stock';
  return 'In stock';
}

export function createProductCatalogRepository(
  client: SupabaseClient<Database>,
): ProductCatalogDataContract {
  return {
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
  listProducts() {
    return createProductCatalogRepository(getClientOrThrow()).listProducts();
  },
};
