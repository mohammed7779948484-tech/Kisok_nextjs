import { describe, expect, it } from 'vitest';

import manifest from './manifest';

describe('KISOK Admin manifest', () => {
  it('launches the locale-prefixed admin with standalone icons', () => {
    const result = manifest();
    expect(result.name).toBe('KISOK Admin');
    expect(result.start_url).toBe('/en/admin');
    expect(result.scope).toBe('/');
    expect(result.display).toBe('standalone');
    expect(result.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
        expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
      ]),
    );
  });
});
