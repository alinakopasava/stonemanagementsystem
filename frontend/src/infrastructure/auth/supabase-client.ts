import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check frontend/.env.'
  );
}

/**
 * Simple in-process mutex to replace supabase-js's default Navigator Locks
 * implementation. The default cross-tab lock is noisy under React 18
 * StrictMode (effects mount twice) and occasionally aborts in-flight
 * requests with NavigatorLockAcquireTimeoutError. For a single-tab SPA
 * this lock is enough.
 */
const inflightByLockName = new Map<string, Promise<unknown>>();

const inMemoryLock = async <R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> => {
  const previous = inflightByLockName.get(name) ?? Promise.resolve();
  const next = previous.then(fn, fn);
  inflightByLockName.set(
    name,
    next.catch(() => undefined)
  );
  return next;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'signature-stone.auth',
    flowType: 'pkce',
    lock: inMemoryLock
  }
});
