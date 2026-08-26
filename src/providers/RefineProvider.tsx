'use client';

import { Suspense } from 'react';

import { Refine, type RouterProvider } from '@refinedev/core';
import nextRouterProvider from '@refinedev/nextjs-router';
import { dataProvider as supabaseDataProvider } from '@refinedev/supabase';

import { Skeleton } from '@/components/ui/skeleton';
import { refineResources } from '@/infrastructure/refine/resources';
import { getBrowserSupabaseClient } from '@/infrastructure/supabase/client/browser-client';

type RefineProviderProps = {
  children: React.ReactNode;
  routerProvider?: RouterProvider;
};

export const RefineProvider = ({
  children,
  routerProvider = nextRouterProvider,
}: RefineProviderProps) => {
  const supabaseClient = getBrowserSupabaseClient();
  if (!supabaseClient) {
    return <>{children}</>;
  }

  return (
    <Suspense
      fallback={
        <Skeleton aria-label="Initializing workspace runtime" className="min-h-screen w-full" />
      }
    >
      <Refine
        dataProvider={supabaseDataProvider(supabaseClient)}
        options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}
        resources={refineResources}
        routerProvider={routerProvider}
      >
        {children}
      </Refine>
    </Suspense>
  );
};
