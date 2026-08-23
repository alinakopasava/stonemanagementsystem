import { getClientIp } from '../http/client-ip.js';

const RATE_LIMIT_MESSAGE = 'Too many attempts. Try again later.';

const createRateLimiter = ({ windowMs, max }) => {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, Math.min(windowMs, 60_000)).unref?.();

  return (req, res, next) => {
    const key = getClientIp(req) || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    const remaining = Math.max(0, max - entry.count);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      return res.status(429).json({ message: RATE_LIMIT_MESSAGE });
    }
    return next();
  };
};

export const apiLimiter = createRateLimiter({ windowMs: 10_000, max: 100 });
export const signInLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });
export const signUpLimiter = createRateLimiter({ windowMs: 60_000, max: 3 });
export const passwordLimiter = createRateLimiter({ windowMs: 60_000, max: 3 });
export const sessionLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
export const contactLimiter = createRateLimiter({ windowMs: 60_000, max: 3 });
export const orderSubmitLimiter = createRateLimiter({ windowMs: 60_000, max: 8 });
