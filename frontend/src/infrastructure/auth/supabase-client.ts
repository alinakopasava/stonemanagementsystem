import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check frontend/.env.'
  );
}

try {
  window.localStorage.removeItem('signature-stone.auth');
} catch {
  // Ignore private-mode / disabled storage.
}

/**
 * Used only to complete email confirmation / password-recovery links created by
 * the backend Supabase client. Those server-initiated email flows use the
 * implicit callback format; supabase-js clears the URL fragment immediately.
 * The long-lived session lives in httpOnly cookies set by the Express API.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: true,
    flowType: 'implicit',
    storageKey: 'signature-stone.auth'
  }
});
