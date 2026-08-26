import type { DataProvider } from '@refinedev/core';

export class RefineDeferredProviderError extends Error {
  constructor(operation: string, resource: string) {
    super(`Refine ${operation} for ${resource} is deferred until the Supabase integration phase.`);
    this.name = 'RefineDeferredProviderError';
  }
}

function failDeferredOperation(operation: string, resource: string): never {
  throw new RefineDeferredProviderError(operation, resource);
}

export const deferredDataProvider: DataProvider = {
  getList: async ({ resource }) => failDeferredOperation('getList', resource),
  getOne: async ({ resource }) => failDeferredOperation('getOne', resource),
  create: async ({ resource }) => failDeferredOperation('create', resource),
  update: async ({ resource }) => failDeferredOperation('update', resource),
  deleteOne: async ({ resource }) => failDeferredOperation('deleteOne', resource),
  getApiUrl: () => 'deferred://supabase-not-configured',
};
