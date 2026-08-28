import request from 'supertest';
import {
  supabaseAdmin,
  setTables,
  resetSupabaseMock
} from './supabase-mock.js';

export const FRONTEND_ORIGIN = 'http://localhost:5173';
export const ACCESS_COOKIE = 'ss-access-token';
export const REFRESH_COOKIE = 'ss-refresh-token';

/**
 * Every request gets its own client IP.
 *
 * The rate limiters keep one counter per IP in module scope, which survives for
 * the lifetime of the worker. Without a distinct IP per test, unrelated tests
 * would drain each other's budget and start failing with 429. Tests that target
 * the limiters deliberately pin a single IP instead (see `fixedIp`).
 */
let ipCounter = 0;
export const nextIp = () => {
  ipCounter += 1;
  return `10.${(ipCounter >> 16) & 0xff}.${(ipCounter >> 8) & 0xff}.${ipCounter & 0xff}`;
};

/**
 * Builds a supertest wrapper that stamps a client IP and a trusted Origin on
 * every request. The Origin matters: `requireTrustedOrigin` rejects any unsafe
 * method that arrives with cookies but no matching Origin.
 */
export const api = (app, options = {}) => {
  const ip = options.fixedIp ?? nextIp();
  const cookies = options.cookies ?? null;

  const build = (method) => (path) => {
    let chain = request(app)[method](path).set('X-Forwarded-For', ip);
    if (options.origin !== null) {
      chain = chain.set('Origin', options.origin ?? FRONTEND_ORIGIN);
    }
    if (cookies) {
      chain = chain.set('Cookie', cookies);
    }
    return chain;
  };

  return {
    ip,
    get: build('get'),
    post: build('post'),
    patch: build('patch'),
    put: build('put'),
    delete: build('delete')
  };
};

export const sessionCookies = ({ access = 'access-token', refresh = 'refresh-token' } = {}) => {
  const jar = [];
  if (access !== null) jar.push(`${ACCESS_COOKIE}=${access}`);
  if (refresh !== null) jar.push(`${REFRESH_COOKIE}=${refresh}`);
  return jar;
};

export const makeSession = (overrides = {}) => ({
  access_token: 'new-access-token',
  refresh_token: 'new-refresh-token',
  expires_in: 3600,
  ...overrides
});

export const makeProfile = (overrides = {}) => ({
  id: 'user-1',
  first_name: 'Anna',
  last_name: 'Kowalska',
  phone_number: '+48111222333',
  role: 'klient',
  created_at: '2026-01-01T00:00:00.000Z',
  ...overrides
});

/**
 * Programs the mock so `requireAuth` resolves a caller with the given role:
 * a valid JWT and a matching `profiles` row.
 */
export const signedInAs = ({ id = 'user-1', role = 'klient', email = 'anna@example.com' } = {}) => {
  const user = { id, email, user_metadata: { first_name: 'Anna', last_name: 'Kowalska' } };

  supabaseAdmin.auth.getUser.mockResolvedValue({ data: { user }, error: null });

  setTables({
    profiles: {
      select: () => ({ data: makeProfile({ id, role }), error: null })
    }
  });

  return { user, profile: makeProfile({ id, role }) };
};

/** Parses `Set-Cookie` into a name -> { value, attrs } map. */
export const parseSetCookie = (response) => {
  const raw = response.headers['set-cookie'] ?? [];
  const out = {};
  for (const line of raw) {
    const [pair, ...attributes] = line.split(';');
    const separator = pair.indexOf('=');
    const name = pair.slice(0, separator).trim();
    out[name] = {
      value: pair.slice(separator + 1).trim(),
      attrs: attributes.map((a) => a.trim().toLowerCase()),
      raw: line
    };
  }
  return out;
};

export const hasAttr = (cookie, attr) =>
  cookie.attrs.some((a) => a === attr.toLowerCase() || a.startsWith(`${attr.toLowerCase()}=`));

export const attrValue = (cookie, attr) => {
  const found = cookie.attrs.find((a) => a.startsWith(`${attr.toLowerCase()}=`));
  return found ? found.slice(attr.length + 1) : null;
};

export { resetSupabaseMock, setTables };
