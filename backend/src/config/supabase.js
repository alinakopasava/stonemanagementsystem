import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * Admin client. Bypasses RLS. Use ONLY for:
 *   - verifying JWTs via auth.getUser()
 *   - privileged admin operations (user management, etc.)
 * Never use this to serve a normal authenticated request on behalf of a user.
 */
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Per-request client bound to the caller's JWT.
 * All queries run with that user's identity, so Row Level Security applies.
 * This is the only client that should touch business tables on behalf of a user.
 */
export const supabaseForUser = (accessToken) =>
  createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
