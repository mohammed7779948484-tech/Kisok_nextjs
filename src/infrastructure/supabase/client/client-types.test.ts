import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expectTypeOf, it } from 'vitest';

import type { Database } from '../database.types';
import { getBrowserSupabaseClient } from './browser-client';
import { getServerSupabaseClient } from './server-client';

describe('Supabase client generated types', () => {
  it('types browser and server clients with the Lean V2 Database contract', () => {
    expectTypeOf(getBrowserSupabaseClient).toEqualTypeOf<() => SupabaseClient<Database> | null>();
    expectTypeOf(getServerSupabaseClient).toEqualTypeOf<
      () => Promise<SupabaseClient<Database> | null>
    >();
  });
});
