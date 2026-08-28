/**
 * The caller's address, as far as it can be trusted.
 *
 * `req.ip` is deliberately the only source. Express derives it from
 * `X-Forwarded-For` when `trust proxy` is configured, and — unlike reading the
 * header by hand — it walks the list from the right, skipping only as many hops
 * as the setting says are ours. Taking the left-most entry instead would take
 * whatever the client typed there, which is how a rate limit keyed on this
 * value gets bypassed: a fresh forged address per attempt is a fresh bucket.
 *
 * With `trust proxy` off, Express ignores the header entirely and reports the
 * socket address, which is what a directly exposed server should count.
 */
export const getClientIp = (req) => req.ip || req.socket?.remoteAddress || null;

export const getUserAgent = (req) => {
  const value = req.headers['user-agent'];
  return typeof value === 'string' ? value.slice(0, 300) : null;
};
