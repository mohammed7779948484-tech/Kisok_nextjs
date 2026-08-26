# Supabase SSR notes

These notes record the current official guidance used for the KISOK Admin V2 integration.

Supabase recommends `@supabase/ssr` with `createBrowserClient` for Client Components and a request-scoped `createServerClient` for Server Components, Server Actions, and Route Handlers. Next.js Server Components cannot write cookies, so a Proxy must refresh Auth tokens and apply refreshed cookies to both the request and response. The Proxy should use `supabase.auth.getClaims()` to validate claims and protect pages; server code must not use an unvalidated `getSession()` user object as the authorization source. The server client must be created per request because it carries request cookie state.

The current Supabase Auth quickstart uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The advanced SSR guide recommends cookie-based PKCE behavior, dynamic/no-store handling for authenticated routes that refresh cookies, and keeping service-role credentials out of browser code. The implementation follows those boundaries and adds an optional server-only `SUPABASE_SERVICE_ROLE_KEY` for future privileged Admin-user routes.

References:

[1]: https://supabase.com/docs/guides/auth/server-side/creating-a-client "Creating a Supabase client for SSR"
[2]: https://supabase.com/docs/guides/auth/quickstarts/nextjs "Use Supabase Auth with Next.js"
[3]: https://supabase.com/docs/guides/auth/server-side/advanced-guide "Supabase Auth advanced guide"
