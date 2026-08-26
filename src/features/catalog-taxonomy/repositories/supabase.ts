import type { SupabaseClient } from '@supabase/supabase-js';

import { getBrowserSupabaseClient } from '@/infrastructure/supabase/client/browser-client';
import type { Database } from '@/infrastructure/supabase/database.types';

import type {
  BrandInput,
  BrandRecord,
  BrandUpdate,
  CatalogTaxonomyDataContract,
  CategoryRecord,
  OptionTypeRecord,
} from '../types';

function getClientOrThrow(): SupabaseClient<Database> {
  const client = getBrowserSupabaseClient();
  if (!client) throw new Error('Supabase is not configured for Catalog Taxonomy.');
  return client;
}

function mapOptionType(row: {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number;
  option_values: Array<{
    id: string;
    value: string;
    is_active: boolean;
    display_order: number;
  }>;
}): OptionTypeRecord {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    displayOrder: row.display_order,
    values: row.option_values.map((value) => ({
      id: value.id,
      value: value.value,
      isActive: value.is_active,
      displayOrder: value.display_order,
    })),
  };
}

function mapCategory(row: Database['public']['Tables']['categories']['Row']): CategoryRecord {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    isActive: row.is_active,
    displayOrder: row.display_order,
    imageMediaAssetId: row.image_media_asset_id,
  };
}

function mapBrand(row: Database['public']['Tables']['brands']['Row']): BrandRecord {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    displayOrder: row.display_order,
    imageMediaAssetId: row.image_media_asset_id,
  };
}

export function createCatalogTaxonomyRepository(
  client: SupabaseClient<Database>,
): CatalogTaxonomyDataContract {
  return {
    async listOptionTypes() {
      const result = await client
        .from('option_types')
        .select(
          'id,name,is_active,display_order,created_at,updated_at,option_values(id,value,is_active,display_order)',
        )
        .order('display_order', { ascending: true });
      if (result.error) throw result.error;
      return (result.data ?? []).map((row) => mapOptionType(row as never));
    },

    async listCategories() {
      const result = await client
        .from('categories')
        .select(
          'id,name,parent_id,is_active,display_order,image_media_asset_id,created_at,updated_at',
        )
        .order('display_order', { ascending: true });
      if (result.error) throw result.error;
      return (result.data ?? []).map(mapCategory);
    },

    async listBrands(search = '') {
      let query = client
        .from('brands')
        .select('id,name,is_active,display_order,image_media_asset_id,created_at,updated_at');
      const normalizedSearch = search.trim();
      if (normalizedSearch) query = query.ilike('name', `%${normalizedSearch}%`);
      const result = await query.order('display_order', { ascending: true });
      if (result.error) throw result.error;
      return (result.data ?? []).map(mapBrand);
    },

    async createBrand(input: BrandInput) {
      const result = await client
        .from('brands')
        .insert({ name: input.name.trim() })
        .select('id,name,is_active,display_order,image_media_asset_id,created_at,updated_at')
        .single();
      if (result.error) throw result.error;
      return mapBrand(result.data);
    },

    async updateBrand(id: string, input: BrandUpdate) {
      const payload: Database['public']['Tables']['brands']['Update'] = {};
      if (input.name !== undefined) payload.name = input.name.trim();
      if (input.isActive !== undefined) payload.is_active = input.isActive;
      const result = await client
        .from('brands')
        .update(payload)
        .eq('id', id)
        .select('id,name,is_active,display_order,image_media_asset_id,created_at,updated_at')
        .single();
      if (result.error) throw result.error;
      return mapBrand(result.data);
    },
  };
}

export const catalogTaxonomyRepository: CatalogTaxonomyDataContract = {
  listBrands(search) {
    return createCatalogTaxonomyRepository(getClientOrThrow()).listBrands(search);
  },
  createBrand(input) {
    return createCatalogTaxonomyRepository(getClientOrThrow()).createBrand(input);
  },
  updateBrand(id, input) {
    return createCatalogTaxonomyRepository(getClientOrThrow()).updateBrand(id, input);
  },
  listCategories() {
    return createCatalogTaxonomyRepository(getClientOrThrow()).listCategories();
  },
  listOptionTypes() {
    return createCatalogTaxonomyRepository(getClientOrThrow()).listOptionTypes();
  },
};
