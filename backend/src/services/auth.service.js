import { env } from '../config/env.js';
import {
  createSupabaseAuthClient,
  supabaseAdmin,
  supabaseForUser
} from '../config/supabase.js';
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

export const updatePassword = async ({ accessToken, password, actorId, ip }) => {
  const passwordCheck = checkPassword(password);
  if (!passwordCheck.ok) {
    throw new PublicError(
      passwordCheck.reason === 'common'
        ? BREACHED_PASSWORD_MESSAGE
        : 'Password does not meet the requirements.',
      400
    );
  }

  const userClient = supabaseForUser(accessToken);
  const { error } = await userClient.auth.updateUser({ password });
  if (error) {
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

export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    return null;
  }
  const authClient = createSupabaseAuthClient();
  const { data, error } = await authClient.auth.refreshSession({
    refresh_token: refreshToken
  });
  if (error || !data.session) {
    return null;
  }
  return data.session;
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
