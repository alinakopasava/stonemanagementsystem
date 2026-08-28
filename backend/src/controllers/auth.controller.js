import { getClientIp, getUserAgent } from '../http/client-ip.js';
import { clearSessionCookies, setSessionCookies, ACCESS_COOKIE } from '../http/cookies.js';
import { sendError } from '../http/errors.js';
import {
  establishSessionFromTokens,
  requestPasswordReset,
  revokeSession,
  signInWithPassword,
  signUpWithPassword,
  updatePassword
} from '../services/auth.service.js';

export const signInController = async (req, res) => {
  try {
    const session = await signInWithPassword({
      email: req.body?.email,
      password: req.body?.password,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    setSessionCookies(res, session);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return sendError(res, error, 'Invalid credentials.');
  }
};

export const signUpController = async (req, res) => {
  try {
    const result = await signUpWithPassword({
      email: req.body?.email,
      password: req.body?.password,
      firstName: req.body?.firstName,
      lastName: req.body?.lastName,
      phoneNumber: req.body?.phoneNumber,
      ip: getClientIp(req)
    });
    if (result.session) {
      setSessionCookies(res, result.session);
    }
    return res.status(201).json({
      ok: true,
      requiresEmailConfirmation: result.requiresEmailConfirmation
    });
  } catch (error) {
    return sendError(res, error, 'Could not create account.');
  }
};

export const signOutController = async (req, res) => {
  try {
    // No refresh token needed: admin.signOut(accessToken, 'global') revokes the
    // whole session family, refresh tokens included.
    await revokeSession({
      accessToken: req.cookies?.[ACCESS_COOKIE] || req.accessToken
    });
    clearSessionCookies(res);
    return res.status(200).json({ ok: true });
  } catch (error) {
    clearSessionCookies(res);
    return sendError(res, error, 'Could not sign out.');
  }
};

export const forgotPasswordController = async (req, res) => {
  try {
    await requestPasswordReset({
      email: req.body?.email
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(200).json({ ok: true });
  }
};

export const establishSessionController = async (req, res) => {
  try {
    const session = await establishSessionFromTokens({
      accessToken: req.body?.accessToken,
      refreshToken: req.body?.refreshToken
    });
    setSessionCookies(res, session);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return sendError(res, error, 'Invalid or expired session.');
  }
};

export const resetPasswordController = async (req, res) => {
  try {
    await updatePassword({
      accessToken: req.accessToken,
      password: req.body?.password,
      actorId: req.user?.id ?? null,
      ip: getClientIp(req)
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return sendError(res, error, 'Could not update password.');
  }
};
