/**
 * Reserved browser client boundary. It is deliberately not a Supabase client
 * until the integration phase supplies the approved browser configuration.
 */
export const deferredBrowserSupabaseClient = {
  connection: 'deferred' as const,
};
