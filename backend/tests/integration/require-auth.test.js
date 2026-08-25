import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/config/supabase.js', () => import('../setup/supabase-mock.js'));

const { app } = await import('../../src/app.js');
const { supabaseAdmin, authClientSpies, supabaseForUser } = await import(
  '../setup/supabase-mock.js'
);
const {
  api,
  sessionCookies,
  makeSession,
  makeProfile,
  parseSetCookie,
  hasAttr,
  resetSupabaseMock,
  setTables,
  stubAuditLogs,
  ACCESS_COOKIE,
  REFRESH_COOKIE
} = await import('../setup/harness.js');

beforeEach(() => {
  resetSupabaseMock();
  stubAuditLogs();
});

/* ------------------------------------------------------------------ */
/* 7.3.1  The authorising middleware — four behaviours                  */
/* ------------------------------------------------------------------ */

describe('requireAuth', () => {
  it('answers 401 when no cookies are presented', async () => {
    const response = await api(app).get('/api/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Not authenticated.' });
    expect(supabaseAdmin.auth.getUser).not.toHaveBeenCalled();
  });

  it('renews the session silently when the access token expired but the refresh token is valid', async () => {
    // First verification fails (expired), the refresh succeeds, the second verification passes.
    supabaseAdmin.auth.getUser
      .mockResolvedValueOnce({ data: { user: null }, error: { message: 'jwt expired' } })
      .mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    authClientSpies.refreshSession.mockResolvedValue({
      data: { session: makeSession(), user: { id: 'user-1' } },
      error: null
    });
    setTables({ profiles: { select: () => ({ data: makeProfile({ id: 'user-1' }), error: null }) } });

    const response = await api(app, { cookies: sessionCookies({ access: 'expired' }) }).get(
      '/api/me'
    );

    // The request goes through — the client is not bounced back to the login form.
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe('user-1');

    const jar = parseSetCookie(response);
    expect(jar[ACCESS_COOKIE].value).toBe('new-access-token');
    expect(hasAttr(jar[ACCESS_COOKIE], 'httponly')).toBe(true);
    // The renewed JWT, not the stale one, is what the per-request client binds to.
    expect(supabaseForUser).toHaveBeenLastCalledWith('new-access-token');
  });

  it('clears both cookies and answers 401 when neither token is valid', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'jwt expired' }
    });
    authClientSpies.refreshSession.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'invalid refresh token' }
    });

    const response = await api(app, { cookies: sessionCookies({ access: 'dead' }) }).get('/api/me');

    expect(response.status).toBe(401);

    // Without the clearing step the browser would keep replaying revoked tokens
    // on every subsequent request.
    const jar = parseSetCookie(response);
    expect(jar[ACCESS_COOKIE].value).toBe('');
    expect(jar[REFRESH_COOKIE].value).toBe('');
  });

  it('creates a missing profile row with the client role', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'legacy-user', email: 'old@example.com', user_metadata: { first_name: 'Jan', last_name: 'Nowak' } } },
      error: null
    });

    const inserts = [];
    let profileExists = false;
    setTables({
      profiles: {
        select: () =>
          profileExists
            ? { data: makeProfile({ id: 'legacy-user', role: 'klient' }), error: null }
            : { data: null, error: null },
        insert: (ctx) => {
          inserts.push(ctx.payload);
          profileExists = true;
          return { data: ctx.payload, error: null };
        }
      }
    });

    const response = await api(app, { cookies: sessionCookies() }).get('/api/me');

    expect(response.status).toBe(200);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ id: 'legacy-user', role: 'klient' });
    expect(response.body.data.role).toBe('klient');
  });

  it('accepts a Bearer token as a fallback for non-browser clients', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'script-user' } },
      error: null
    });
    setTables({
      profiles: { select: () => ({ data: makeProfile({ id: 'script-user' }), error: null }) }
    });

    const response = await api(app).get('/api/me').set('Authorization', 'Bearer script-token');

    expect(response.status).toBe(200);
    expect(supabaseForUser).toHaveBeenCalledWith('script-token');
  });
});

/* ------------------------------------------------------------------ */
/* 7.3.2  Role-based authorisation — allowed and denied per pair        */
/* ------------------------------------------------------------------ */

const signInAs = (role, id = `${role}-1`) => {
  supabaseAdmin.auth.getUser.mockResolvedValue({ data: { user: { id } }, error: null });
  setTables({ profiles: { select: () => ({ data: makeProfile({ id, role }), error: null }) } });
};

const ADMIN_ENDPOINTS = [
  ['get', '/api/admin/users'],
  ['get', '/api/admin/orders'],
  ['get', '/api/admin/order-cards'],
  ['get', '/api/admin/contact-messages']
];

describe('role-based access control', () => {
  describe.each([['klient'], ['monter']])('a %s account', (role) => {
    it.each(ADMIN_ENDPOINTS)('is refused %s %s with 403', async (method, path) => {
      signInAs(role);

      const response = await api(app, { cookies: sessionCookies() })[method](path);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: 'Insufficient permissions.' });
    });
  });

  it('lets an admin read the user list', async () => {
    signInAs('admin');
    // Two different `profiles` reads happen in one request: requireAuth resolves
    // the caller's own row via maybeSingle, then listUsers reads the whole table.
    setTables({
      profiles: {
        select: (ctx) =>
          ctx.maybeSingle
            ? { data: makeProfile({ id: 'admin-1', role: 'admin' }), error: null }
            : { data: [makeProfile({ id: 'admin-1', role: 'admin' })], error: null }
      }
    });

    const response = await api(app, { cookies: sessionCookies() }).get('/api/admin/users');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  // The positive case has to be asserted alongside the negative one: a middleware
  // that refused *everybody* would satisfy the 403 test on its own.
  it('lets a monter read the installation worklist', async () => {
    signInAs('monter');
    setTables({ orders: { select: () => ({ data: [], error: null }) } });

    const response = await api(app, { cookies: sessionCookies() }).get('/api/installation-cards');

    expect(response.status).toBe(200);
  });

  it('refuses a klient the same installation worklist with 403', async () => {
    signInAs('klient');

    const response = await api(app, { cookies: sessionCookies() }).get('/api/installation-cards');

    expect(response.status).toBe(403);
  });

  it('answers 401, not 403, when the worklist is requested without a session', async () => {
    const response = await api(app).get('/api/installation-cards');

    expect(response.status).toBe(401);
  });
});
