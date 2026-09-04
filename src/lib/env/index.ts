import { defineEnv, e } from '@teispace/env/next';

/**
 * Validated, coerced, frozen environment — the single source of truth.
 *
 * Powered by `@teispace/env` (the split/leak-guard model):
 *
 * - `server` vars are validated and exposed only on the server. Reading one in
 *   a client (`'use client'`) module **throws** instead of silently bundling a
 *   value — so a future refactor can't leak server config into the browser.
 * - `client` vars must carry the `NEXT_PUBLIC_` prefix (enforced at define
 *   time) and are inlined into the browser bundle by Next.
 * - `shared` vars are available everywhere with no prefix rule. `NODE_ENV`
 *   lives here because the logger reads `env.NODE_ENV` on both server and
 *   client — a `server`-group var would trip the leak guard there.
 *
 * `runtimeEnv` lists every key explicitly: Next statically replaces
 * `process.env.X` only at literal access sites, so a dynamic read in the
 * package can't see client vars unless they're spelled out here.
 *
 * Invalid/malformed config fails fast at module load with one aggregated,
 * secret-redacted error listing every offending variable.
 */
export const env = defineEnv({
  server: {
    DEFAULT_TIMEZONE: e
      .string()
      .default('UTC')
      .describe('IANA time zone for server-rendered date formatting (keeps SSR deterministic).'),
    DEFAULT_LOCALE: e
      .string()
      .default('en')
      .describe('Fallback locale when a request locale cannot be resolved.'),
    SUPABASE_SERVICE_ROLE_KEY: e
      .string()
      .optional()
      .describe('Supabase service role key for server-only privileged operations.'),
    CLOUDINARY_CLOUD_NAME: e.string().optional(),
    CLOUDINARY_API_KEY: e.string().optional(),
    CLOUDINARY_API_SECRET: e.string().optional(),
  },
  client: {
    NEXT_PUBLIC_API_URL: e
      .url()
      .optional()
      .describe('Bare origin of the backing API. Empty → relative/proxied requests.'),
    NEXT_PUBLIC_APP_URL: e
      .url()
      .default('http://localhost:3000')
      .describe('Public URL this app is served from (OG/canonical URLs).'),
    NEXT_PUBLIC_SUPABASE_URL: e.url().optional().describe('Local or hosted Supabase project URL.'),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: e
      .string()
      .optional()
      .describe('Supabase publishable/anon key safe for browser use.'),
  },
  shared: {
    NODE_ENV: e.enum(['development', 'production', 'test']).default('development'),
  },
  runtimeEnv: {
    DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE,
    DEFAULT_LOCALE: process.env.DEFAULT_LOCALE,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  },
});

export type Env = typeof env;
