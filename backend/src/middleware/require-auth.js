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

    const selectProfile = async () =>
      supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, phone_number, role')
        .eq('id', data.user.id)
        .maybeSingle();

    let { data: profile, error: profileError } = await selectProfile();

    if (profileError) {
      return res.status(500).json({ message: 'Failed to load user profile.' });
    }

    if (!profile) {
      const metadata = data.user.user_metadata ?? {};
      const { error: upsertError } = await supabaseAdmin.from('profiles').upsert(
        {
          id: data.user.id,
          first_name: typeof metadata.first_name === 'string' ? metadata.first_name : '',
          last_name: typeof metadata.last_name === 'string' ? metadata.last_name : '',
          phone_number: typeof metadata.phone_number === 'string' ? metadata.phone_number : null,
          role: 'klient'
        },
        { onConflict: 'id' }
      );

      if (upsertError) {
        return res.status(500).json({ message: 'Failed to initialize user profile.' });
      }

      const reloaded = await selectProfile();
      profile = reloaded.data;
      profileError = reloaded.error;
      if (profileError || !profile) {
        return res.status(500).json({ message: 'Profile was not initialized correctly.' });
      }
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
