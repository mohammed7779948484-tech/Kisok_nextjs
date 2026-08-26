import { describe, expect, it } from 'vitest';

import { localAccessContract } from './local-access';

describe('localAccessContract', () => {
  it('exposes a non-enforced local demonstration state', () => {
    expect(localAccessContract.get()).toEqual({
      label: 'Local UI only',
      mode: 'local-demo',
      protection: 'not-enforced',
    });
  });
});
