import { env } from '../config/env.js';
import {
  createSupabaseAuthClient,
  supabaseAdmin,
  supabaseForUser
} from '../config/supabase.js';
import { PublicError } from '../http/errors.js';
import { writeAuditLog } from './audit.service.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const passwordIsStrong = (password) =>
  typeof password === 'string' &&
  password.length >= 8 &&
  password.length <= 128 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password);

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
    await writeAuditLog({
      action: 'auth.sign_in_failed',
      ip,
      userAgent
    });
    throw new PublicError('Invalid credentials.', 401);
  }

  await writeAuditLog({
    actorId: data.user.id,
    action: 'auth.sign_in',
    ip,
    userAgent
  });

  return data.session;
};

export const signUpWithPassword = async ({
  email,
  password,
  firstName,
  lastName,
  phoneNumber,
  ip,
  userAgent
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
  if (!passwordIsStrong(password)) {
    throw new PublicError('Could not create account.', 400);
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
    await writeAuditLog({
      action: 'auth.sign_up_failed',
      ip,
      userAgent
    });
    throw new PublicError('Could not create account.', 400);
  }

  await writeAuditLog({
    actorId: data.user?.id ?? null,
    action: 'auth.sign_up',
    ip,
    userAgent
  });

  return {
    requiresEmailConfirmation: !data.session,
    session: data.session
  };
};

export const requestPasswordReset = async ({ email, ip, userAgent }) => {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail.length <= 254 && EMAIL_PATTERN.test(normalizedEmail)) {
    const authClient = createSupabaseAuthClient();
    await authClient.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${env.frontendOrigin}/auth/reset-password`
    });
  }

  await writeAuditLog({
    action: 'auth.password_reset_requested',
    ip,
    userAgent
  });
};

export const establishSessionFromTokens = async ({ accessToken, refreshToken }) => {
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

export const updatePassword = async ({ accessToken, password }) => {
  if (!passwordIsStrong(password)) {
    throw new PublicError('Password does not meet the requirements.', 400);
  }

  const userClient = supabaseForUser(accessToken);
  const { error } = await userClient.auth.updateUser({ password });
  if (error) {
    throw new PublicError('Could not update password.', 400);
  }
};

export const revokeSession = async ({ accessToken, actorId, ip, userAgent }) => {
  let resolvedActor = actorId ?? null;
  if (accessToken) {
    try {
      const { data } = await supabaseAdmin.auth.getUser(accessToken);
      resolvedActor = data.user?.id ?? resolvedActor;
      await supabaseAdmin.auth.admin.signOut(accessToken, 'global');
    } catch (error) {
      console.error('[auth] Failed to revoke session:', error);
    }
  }

  await writeAuditLog({
    actorId: resolvedActor,
    action: 'auth.sign_out',
    ip,
    userAgent
  });
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
