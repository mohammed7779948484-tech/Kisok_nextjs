'use client';

import { useState } from 'react';

import { productCatalogRepository } from '../repositories';
import type { ProductWriteResult } from '../types';

export interface ProductEditorValues {
  name: string;
  brandId: string | null;
  shortDescription: string | null;
  isFeatured: boolean;
  isActive: boolean;
  categoryIds: string[];
}

/**
 * Lean V2 Products may stay "incomplete" — this never forces every field to
 * be filled before saving. Create keeps the original behavior of omitting
 * `categoryIds` entirely when none are selected (so `createProduct`'s
 * payload assertion in existing tests stays exact); edit always reconciles
 * the full Category set via a dedicated diff call, since a Product that
 * already has Categories must be able to have all of them removed.
 */
export function useProductEditor(params: { mode: 'create' | 'edit'; productId?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(values: ProductEditorValues): Promise<ProductWriteResult> {
    setIsSubmitting(true);
    setError(null);
    try {
      if (params.mode === 'create') {
        return await productCatalogRepository.createProduct({
          name: values.name,
          brandId: values.brandId,
          shortDescription: values.shortDescription,
          isFeatured: values.isFeatured,
          ...(values.categoryIds.length > 0 ? { categoryIds: values.categoryIds } : {}),
        });
      }

      if (!params.productId) throw new Error('Missing Product id for edit.');
      const updated = await productCatalogRepository.updateProduct(params.productId, {
        name: values.name,
        brandId: values.brandId,
        shortDescription: values.shortDescription,
        isFeatured: values.isFeatured,
        isActive: values.isActive,
      });
      await productCatalogRepository.setProductCategories(params.productId, values.categoryIds);
      return updated;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Save failed.';
      setError(message);
      throw caughtError;
    } finally {
      setIsSubmitting(false);
    }
  }

  return { submit, isSubmitting, error };
}
