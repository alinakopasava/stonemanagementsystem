import { env } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const requireTrustedOrigin = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  if (!origin) {
    if (req.headers.cookie) {
      return res.status(403).json({ message: 'Forbidden origin.' });
    }
    return next();
  }

  if (origin !== env.frontendOrigin) {
    return res.status(403).json({ message: 'Forbidden origin.' });
  }
  return next();
};
