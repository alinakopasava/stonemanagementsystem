import { env } from '../config/env.js';

export const ACCESS_COOKIE = 'ss-access-token';
export const REFRESH_COOKIE = 'ss-refresh-token';

const ACCESS_MAX_AGE_MS = 60 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 60 * 60 * 24 * 7 * 1000;

export const parseCookies = (header) => {
  const out = {};
  if (!header || typeof header !== 'string') {
    return out;
  }
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
};

export const cookieParser = (req, _res, next) => {
  req.cookies = parseCookies(req.headers.cookie);
  next();
};

const baseCookieOptions = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: '/',
});

export const setSessionCookies = (res, session) => {
  const accessMaxAge = Number(session?.expires_in)
    ? Number(session.expires_in) * 1000
    : ACCESS_MAX_AGE_MS;

  res.cookie(ACCESS_COOKIE, session.access_token, {
    ...baseCookieOptions(),
    maxAge: accessMaxAge
  });
  res.cookie(REFRESH_COOKIE, session.refresh_token, {
    ...baseCookieOptions(),
    maxAge: REFRESH_MAX_AGE_MS
  });
};

export const clearSessionCookies = (res) => {
  const options = baseCookieOptions();
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
};
