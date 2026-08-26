import { describe, expect, it } from 'vitest';

import { routing } from './routing';

describe('localized routing', () => {
  it('uses always-prefixed locale URLs so localized login and Admin links cannot loop', () => {
    expect(routing.localePrefix).toBe('always');
  });
});
