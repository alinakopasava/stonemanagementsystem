import { env } from '../config/env.js';
import { createSupabaseAuthClient, supabaseAdmin } from '../config/supabase.js';
import { PublicError } from '../http/errors.js';
import { checkPassword } from './password-policy.js';
import { logSecurityEvent } from './security-log.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BREACHED_PASSWORD_MESSAGE =
  'This password is among the most commonly used ones. Choose a different one.';

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

export const signInWithPassword = async ({ email, password, ip, userAgent }) => {
  const normalizedEmail = normalizeEmail(email);
  if (
    !EMAIL_PATTERN.test(normalizedEmail) ||
    normalizedEmail.length > 254 ||
    typeof password !== 'string' ||
    !password ||
    password.length > 128
  ) {
    throw new PublicError('Invalid credentials.', 401);
  }

  const authClient = createSupabaseAuthClient();
  const { data, error } = await authClient.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });

  if (error || !data.session || !data.user) {
    logSecurityEvent('auth.sign_in_failed', { ip, userAgent });
    throw new PublicError('Invalid credentials.', 401);
  }

  logSecurityEvent('auth.sign_in', { actorId: data.user.id, ip });

  return data.session;
};

export const signUpWithPassword = async ({
  email,
  password,
  firstName,
  lastName,
  phoneNumber,
  ip
}) => {
  const normalizedEmail = normalizeEmail(email);
  const first = typeof firstName === 'string' ? firstName.trim() : '';
  const last = typeof lastName === 'string' ? lastName.trim() : '';
  const phone = typeof phoneNumber === 'string' ? phoneNumber.trim() : '';

  if (
    !EMAIL_PATTERN.test(normalizedEmail) ||
    normalizedEmail.length > 254 ||
    first.length < 2 ||
    first.length > 80 ||
    last.length < 2 ||
    last.length > 80 ||
    phone.length > 32
  ) {
    throw new PublicError('Could not create account.', 400);
  }
  const passwordCheck = checkPassword(password);
  if (!passwordCheck.ok) {
    // A weak shape is already blocked by the form, so a generic message covers
    // it. A breached password passes every visible rule, so saying nothing
    // would leave the user retyping something that looks compliant.
    throw new PublicError(
      passwordCheck.reason === 'common'
        ? BREACHED_PASSWORD_MESSAGE
        : 'Could not create account.',
      400
    );
  }

  const authClient = createSupabaseAuthClient();
  const { data, error } = await authClient.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        first_name: first,
        last_name: last,
        phone_number: phone || null
      },
      emailRedirectTo: `${env.frontendOrigin}/auth/callback`
    }
  });

  if (error) {
    logSecurityEvent('auth.sign_up_failed', { ip });
    throw new PublicError('Could not create account.', 400);
  }

  logSecurityEvent('auth.sign_up', { actorId: data.user?.id ?? null, ip });

  return {
    requiresEmailConfirmation: !data.session,
    session: data.session
  };
};

export const requestPasswordReset = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail.length <= 254 && EMAIL_PATTERN.test(normalizedEmail)) {
    const authClient = createSupabaseAuthClient();
    await authClient.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${env.frontendOrigin}/auth/reset-password`
    });
  }
};

export const establishSessionFromTokens = async ({
  accessToken,
  refreshToken
}) => {
  if (
    typeof accessToken !== 'string' ||
    typeof refreshToken !== 'string' ||
    !accessToken ||
    !refreshToken ||
    accessToken.length > 8192 ||
    refreshToken.length > 8192
  ) {
    throw new PublicError('Invalid or expired session.', 401);
  }

  const { data: accessData, error: accessError } =
    await supabaseAdmin.auth.getUser(accessToken);
  if (accessError || !accessData?.user) {
    throw new PublicError('Invalid or expired session.', 401);
  }

  // Validate and rotate the supplied refresh token as well. Merely validating the
  // access token would let a caller pair it with a refresh token from another user.
  const authClient = createSupabaseAuthClient();
  const { data: refreshData, error: refreshError } =
    await authClient.auth.refreshSession({ refresh_token: refreshToken });
  if (
    refreshError ||
    !refreshData.session ||
    !refreshData.user ||
    refreshData.user.id !== accessData.user.id
  ) {
    throw new PublicError('Invalid or expired session.', 401);
  }

  return refreshData.session;
};

/**
 * Sets a new password for an already-authenticated caller.
 *
 * The write goes through the admin client rather than a user-scoped one. A
 * user-scoped client here carries the caller's JWT as a request header, which
 * is all PostgREST needs but not what a password change needs: that call reads
 * the session the client holds in memory, and a per-request client built on the
 * server holds none. It answered "Auth session missing" every time, which the
 * browser saw as a plain 400 and reported as a failed password change.
 *
 * Whose password gets changed is decided by `userId`, taken from the JWT that
 * `requireAuth` already verified, so the caller can only ever change their own.
 */
export const updatePassword = async ({ userId, password, actorId, ip }) => {
  const passwordCheck = checkPassword(password);
  if (!passwordCheck.ok) {
    throw new PublicError(
      passwordCheck.reason === 'common'
        ? BREACHED_PASSWORD_MESSAGE
        : 'Password does not meet the requirements.',
      400
    );
  }

  if (!userId) {
    throw new PublicError('Not authenticated.', 401);
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  if (error) {
    console.error('[auth] Password update failed:', error);
    logSecurityEvent('auth.password_reset_failed', { actorId, ip });
    throw new PublicError('Could not update password.', 400);
  }

  logSecurityEvent('auth.password_reset', { actorId, ip });
};

export const revokeSession = async ({ accessToken }) => {
  if (accessToken) {
    try {
      await supabaseAdmin.auth.admin.signOut(accessToken, 'global');
    } catch (error) {
      console.error('[auth] Failed to revoke session:', error);
    }
  }
};

/*
 * One refresh at a time per token.
 *
 * Supabase refresh tokens are single-use: a successful refresh rotates the
 * token and retires the one that was sent. A browser does not open one page
 * at a time, so when the access token expires the requests already in flight
 * all arrive carrying the same refresh cookie. Without this map each of them
 * would spend that token on its own refresh, one would win, and the rest
 * would come back "Already Used" and be treated as a dead session, which is
 * how a perfectly valid login ended up reported as failed until the customer
 * clicked again.
 *
 * The entry is dropped as soon as the call settles, so a token really is
 * refreshed once per burst and never held longer than the request that
 * asked for it.
 */
const refreshesInFlight = new Map();

const isTransient = (error) =>
  error?.name === 'AuthRetryableFetchError' || (typeof error?.status === 'number' && error.status >= 500);

const performRefresh = async (refreshToken) => {
  const authClient = createSupabaseAuthClient();
  try {
    const { data, error } = await authClient.auth.refreshSession({
      refresh_token: refreshToken
    });
    if (error || !data?.session) {
      // Supabase being unreachable is not the same as the customer being
      // logged out, and must not cost them their cookies.
      return { session: null, reason: isTransient(error) ? 'unavailable' : 'invalid' };
    }
    return { session: data.session, reason: null };
  } catch (error) {
    console.error('[auth] Refresh request failed:', error);
    return { session: null, reason: 'unavailable' };
  }
};

/**
 * Exchanges a refresh token for a fresh session.
 *
 * @returns {Promise<{session: object|null, reason: 'invalid'|'unavailable'|null}>}
 *   `reason` tells the caller whether the session is genuinely gone
 *   (`invalid`) or whether the attempt should simply be retried later
 *   (`unavailable`).
 */
export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    return { session: null, reason: 'invalid' };
  }

  const pending = refreshesInFlight.get(refreshToken);
  if (pending) {
    return pending;
  }

  const run = performRefresh(refreshToken);
  refreshesInFlight.set(refreshToken, run);
  try {
    return await run;
  } finally {
    refreshesInFlight.delete(refreshToken);
  }
};

/**
 * Ensures a profile row exists for a newly-authenticated user whose
 * Supabase trigger did not fire (e.g. first login on a pre-existing
 * auth.users row without a corresponding profiles row).
 *
 * Uses the service-role client ONLY for the INSERT because the
 * `profiles` table intentionally has no client INSERT policy — inserts
 * are reserved for the trigger and this fallback path. The operation is
 * idempotent: a conflict on `id` is silently ignored.
 */
export const ensureProfileExists = async ({ userId, metadata }) => {
  const { error } = await supabaseAdmin.from('profiles').insert({
    id: userId,
    first_name: typeof metadata?.first_name === 'string' ? metadata.first_name : '',
    last_name: typeof metadata?.last_name === 'string' ? metadata.last_name : '',
    phone_number: typeof metadata?.phone_number === 'string' ? metadata.phone_number : null,
    role: 'klient'
  });
  if (error && error.code !== '23505') {
    throw error;
  }
};
