/**
 * Reserved server client boundary. It is deliberately not a Supabase client
 * until the integration phase supplies the approved server configuration.
 */
export const deferredServerSupabaseClient = {
  connection: 'deferred' as const,
};
