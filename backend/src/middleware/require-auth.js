import { supabaseAdmin, supabaseForUser } from '../config/supabase.js';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  setSessionCookies
} from '../http/cookies.js';
import { ensureProfileExists, refreshAccessToken } from '../services/auth.service.js';

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') {
    return null;
  }
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }
  return token.trim();
};

const toAuthUser = (user, profile) => ({
  id: user.id,
  email: user.email ?? null,
  role: profile.role,
  profile: {
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    phoneNumber: profile.phone_number,
    role: profile.role
  }
});

/**
 * Verifies the Supabase JWT from an httpOnly cookie (or Authorization header),
 * loads the user's profile (and role), and attaches a per-request Supabase
 * client that runs as that user so Row Level Security is always enforced.
 */
export const requireAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.[ACCESS_COOKIE] || extractBearerToken(req.headers.authorization);

    if (!token) {
      const refreshed = await refreshAccessToken(req.cookies?.[REFRESH_COOKIE]);
      if (!refreshed.session) {
        if (refreshed.reason === 'unavailable') {
          return res.status(503).json({ message: 'Authentication service unavailable.' });
        }
        return res.status(401).json({ message: 'Not authenticated.' });
      }
      setSessionCookies(res, refreshed.session);
      token = refreshed.session.access_token;
    }

    let { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      const refreshed = await refreshAccessToken(req.cookies?.[REFRESH_COOKIE]);
      if (!refreshed.session) {
        // Cookies are only worth destroying when the session itself is gone.
        // A momentary outage must leave the customer signed in.
        if (refreshed.reason === 'unavailable') {
          return res.status(503).json({ message: 'Authentication service unavailable.' });
        }
        clearSessionCookies(res);
        return res.status(401).json({ message: 'Invalid or expired session.' });
      }
      setSessionCookies(res, refreshed.session);
      token = refreshed.session.access_token;
      ({ data, error } = await supabaseAdmin.auth.getUser(token));
      if (error || !data?.user) {
        clearSessionCookies(res);
        return res.status(401).json({ message: 'Invalid or expired session.' });
      }
    }

    const userScopedClient = supabaseForUser(token);

    const selectProfile = async () =>
      userScopedClient
        .from('profiles')
        .select('id, first_name, last_name, phone_number, role')
        .eq('id', data.user.id)
        .maybeSingle();

    let { data: profile, error: profileError } = await selectProfile();

    if (profileError) {
      return res.status(500).json({ message: 'Failed to load user profile.' });
    }

    if (!profile) {
      try {
        await ensureProfileExists({ userId: data.user.id, metadata: data.user.user_metadata ?? {} });
      } catch {
        return res.status(500).json({ message: 'Failed to initialize user profile.' });
      }

      const reloaded = await selectProfile();
      profile = reloaded.data;
      profileError = reloaded.error;
      if (profileError || !profile) {
        return res.status(500).json({ message: 'Profile was not initialized correctly.' });
      }
    }

    req.user = toAuthUser(data.user, profile);
    req.accessToken = token;
    req.supabase = userScopedClient;

    return next();
  } catch (error) {
    console.error('[auth] Unexpected authentication error:', error);
    return res.status(500).json({ message: 'Authentication error.' });
  }
};

/** Factory: require the caller to have one of the given roles. */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }
    return next();
  };
};
