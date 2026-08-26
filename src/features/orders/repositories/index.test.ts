import { describe, expect, it } from 'vitest';

import { ordersRepository } from '.';

describe('ordersRepository', () => {
  it('provides the local order collection through the feature repository boundary', () => {
    expect(ordersRepository.list()).toHaveLength(3);
    expect(ordersRepository.list()[0]?.id).toBe('KSK001');
  });
});
