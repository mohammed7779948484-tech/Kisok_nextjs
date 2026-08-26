'use client';

import { Suspense } from 'react';

import { Refine, type RouterProvider } from '@refinedev/core';
import nextRouterProvider from '@refinedev/nextjs-router';

import { Skeleton } from '@/components/ui/skeleton';
import { deferredDataProvider } from '@/infrastructure/refine/deferred-data-provider';
import { refineResources } from '@/infrastructure/refine/resources';

type RefineProviderProps = {
  children: React.ReactNode;
  routerProvider?: RouterProvider;
};

export const RefineProvider = ({
  children,
  routerProvider = nextRouterProvider,
}: RefineProviderProps) => {
  return (
    <Suspense
      fallback={
        <Skeleton aria-label="Initializing workspace runtime" className="min-h-screen w-full" />
      }
    >
      <Refine
        dataProvider={deferredDataProvider}
        options={{ syncWithLocation: false, warnWhenUnsavedChanges: true }}
        resources={refineResources}
        routerProvider={routerProvider}
      >
        {children}
      </Refine>
    </Suspense>
  );
};
