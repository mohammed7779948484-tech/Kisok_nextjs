import type { ReactElement, ReactNode } from 'react';

import { NextIntlClientProvider } from 'next-intl';

import { type RenderOptions, render } from '@testing-library/react';
import { Provider } from 'react-redux';

import { type AppState, type AppStore, makeStore } from '@/store';
import type { SupportedLocale } from '@/types/i18n';

type TestProvidersProps = {
  children: ReactNode;
  store?: AppStore;
  preloadedState?: Partial<AppState>;
  messages?: Record<string, unknown>;
  locale?: SupportedLocale;
};

export function TestProviders({
  children,
  store,
  preloadedState,
  messages = {},
  locale = 'en',
}: TestProvidersProps) {
  const testStore = store ?? makeStore(preloadedState);

  return (
    <Provider store={testStore}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </Provider>
  );
}

type ExtendedRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  store?: AppStore;
  preloadedState?: Partial<AppState>;
  messages?: Record<string, unknown>;
  locale?: SupportedLocale;
};

export function renderWithProviders(
  ui: ReactElement,
  { store, preloadedState, messages, locale, ...renderOptions }: ExtendedRenderOptions = {},
) {
  const testStore = store ?? makeStore(preloadedState);

  return {
    store: testStore,
    ...render(ui, {
      wrapper: ({ children }) => (
        <TestProviders store={testStore} messages={messages} locale={locale}>
          {children}
        </TestProviders>
      ),
      ...renderOptions,
    }),
  };
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
