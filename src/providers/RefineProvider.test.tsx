import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RefineProvider } from './RefineProvider';

const testRouterProvider = {
  back: () => () => undefined,
  go: () => () => '/en',
  parse: () => () => ({ params: {}, pathname: '/en' }),
};

describe('RefineProvider', () => {
  it('mounts Refine around Kisok client descendants without a live data connection', () => {
    render(
      <RefineProvider routerProvider={testRouterProvider}>
        <output>kisok client subtree</output>
      </RefineProvider>,
    );

    expect(screen.getByText('kisok client subtree')).toBeInTheDocument();
  });
});
