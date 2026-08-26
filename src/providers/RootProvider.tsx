'use client';

import { type AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';

import { TooltipProvider } from '@/components/ui/tooltip';
import { CustomThemeProvider } from '@/providers';
import type { AppState } from '@/store';
import type { SupportedLocale } from '@/types/i18n';

import { RefineProvider } from './RefineProvider';
import { StoreProvider } from './StoreProvider';

type RootProviderProps = {
  children: React.ReactNode;
  locale: SupportedLocale;
  messages: AbstractIntlMessages;
  timeZone: string;
  preloadedState?: Partial<AppState>;
};

export const RootProvider = ({
  children,
  locale,
  messages,
  timeZone,
  preloadedState,
}: RootProviderProps) => {
  return (
    <StoreProvider preloadedState={preloadedState}>
      <CustomThemeProvider>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
          <RefineProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </RefineProvider>
        </NextIntlClientProvider>
      </CustomThemeProvider>
    </StoreProvider>
  );
};
