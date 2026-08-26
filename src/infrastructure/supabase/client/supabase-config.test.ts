import { describe, expect, it } from 'vitest';

import { getSupabaseConfig } from './supabase-config';

describe('getSupabaseConfig', () => {
  it('returns a usable configuration only when both public connection values exist', () => {
    expect(getSupabaseConfig('http://127.0.0.1:54321', 'publishable-key')).toEqual({
      url: 'http://127.0.0.1:54321',
      key: 'publishable-key',
    });
    expect(getSupabaseConfig('', 'publishable-key')).toBeNull();
    expect(getSupabaseConfig('http://127.0.0.1:54321', '')).toBeNull();
  });
});
