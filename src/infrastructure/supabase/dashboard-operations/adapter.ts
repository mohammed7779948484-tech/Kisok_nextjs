/** Deferred adapter boundary. The dashboard composes feature repositories later. */
export const dashboardOperationsSupabaseAdapter = {
  connection: 'deferred' as const,
};
