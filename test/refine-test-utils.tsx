import type { ReactElement, ReactNode } from 'react';

import type { DataProvider } from '@refinedev/core';
import { Refine } from '@refinedev/core';
import {
  type RenderHookOptions,
  type RenderOptions,
  render,
  renderHook,
} from '@testing-library/react';

/**
 * A `DataProvider` stub for hook/component tests: every method throws
 * unless a test explicitly overrides it, so a test can never pass by
 * silently hitting an unstubbed method it didn't mean to exercise.
 */
export function createMockDataProvider(overrides: Partial<DataProvider> = {}): DataProvider {
  const notImplemented = (method: string) => async () => {
    throw new Error(`Mock data provider: "${method}" was not stubbed for this test.`);
  };
  return {
    getList: notImplemented('getList') as DataProvider['getList'],
    getOne: notImplemented('getOne') as DataProvider['getOne'],
    getMany: notImplemented('getMany') as DataProvider['getMany'],
    create: notImplemented('create') as DataProvider['create'],
    createMany: notImplemented('createMany') as DataProvider['createMany'],
    update: notImplemented('update') as DataProvider['update'],
    updateMany: notImplemented('updateMany') as DataProvider['updateMany'],
    deleteOne: notImplemented('deleteOne') as DataProvider['deleteOne'],
    deleteMany: notImplemented('deleteMany') as DataProvider['deleteMany'],
    getApiUrl: () => '',
    custom: notImplemented('custom') as DataProvider['custom'],
    ...overrides,
  };
}

function refineWrapper(dataProvider: DataProvider, resourceNames: string[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Refine dataProvider={dataProvider} resources={resourceNames.map((name) => ({ name }))}>
        {children}
      </Refine>
    );
  };
}

export function renderWithRefine(
  ui: ReactElement,
  dataProvider: DataProvider,
  resourceNames: string[],
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: refineWrapper(dataProvider, resourceNames), ...options });
}

export function renderHookWithRefine<TResult, TProps>(
  callback: (props: TProps) => TResult,
  dataProvider: DataProvider,
  resourceNames: string[],
  options?: Omit<RenderHookOptions<TProps>, 'wrapper'>,
) {
  return renderHook(callback, { wrapper: refineWrapper(dataProvider, resourceNames), ...options });
}
