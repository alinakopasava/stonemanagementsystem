import { supabaseAdmin, supabaseForUser } from '../config/supabase.js';

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

/**
 * Verifies the Supabase JWT from the Authorization header, loads the user's
 * profile (and role), and attaches a per-request Supabase client that runs
 * as that user so Row Level Security is always enforced.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ message: 'Missing or malformed Authorization header.' });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ message: 'Invalid or expired session.' });
    }

    const userScopedClient = supabaseForUser(token);

    const { data: profile, error: profileError } = await userScopedClient
      .from('profiles')
      .select('id, first_name, last_name, phone_number, role')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ message: 'Profile not found for this account.' });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email ?? null,
      role: profile.role,
      profile
    };
    req.supabase = userScopedClient;

    return next();
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Authentication error.'
    });
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
