/**
 * Stand-in for the browser Supabase client.
 *
 * In the real app supabase-js exists only to finish server-initiated email
 * confirmation and recovery links; the session itself lives in httpOnly cookies.
 * The component suite has no Supabase project and no VITE_SUPABASE_* values, so
 * the client is aliased away and the auth handoff is driven through MSW instead.
 */
const noSession = { data: { session: null }, error: null };

export const supabase = {
  auth: {
    getSession: async () => noSession,
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } }
    }),
    exchangeCodeForSession: async () => noSession,
    setSession: async () => noSession,
    signOut: async () => ({ error: null })
  }
};

export default supabase;
