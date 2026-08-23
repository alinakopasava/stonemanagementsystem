import { env } from '../config/env.js';

export const getClientIp = (req) => {
  if (env.trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
  }
  return req.ip || req.socket?.remoteAddress || null;
};

export const getUserAgent = (req) => {
  const value = req.headers['user-agent'];
  return typeof value === 'string' ? value.slice(0, 300) : null;
};
