import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/config/supabase.js', () => import('../setup/supabase-mock.js'));

const { app } = await import('../../src/app.js');
const {
  supabaseAdmin,
  authClientSpies,
  userClientSpies,
  createSupabaseAuthClient
} = await import('../setup/supabase-mock.js');
const {
  api,
  sessionCookies,
  makeSession,
  signedInAs,
  parseSetCookie,
  hasAttr,
  attrValue,
  resetSupabaseMock,
  setTables,
  ACCESS_COOKIE,
  REFRESH_COOKIE
} = await import('../setup/harness.js');

beforeEach(() => {
  resetSupabaseMock();
});

/* ------------------------------------------------------------------ */
/* 7.3.1  Sign-in — uniform failure                                     */
/* ------------------------------------------------------------------ */

describe('POST /api/auth/sign-in', () => {
  const credentials = { email: 'anna@example.com', password: 'Correct123' };

  it('answers identically for an unknown address and for a wrong password', async () => {
    // Supabase returns the same generic error for both, but the point of the test
    // is the response the *client* sees: it must not reveal which field was wrong,
    // because "this address has an account here" is itself personal data.
    authClientSpies.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' }
    });

    const unknownAddress = await api(app)
      .post('/api/auth/sign-in')
      .send({ email: 'nobody@example.com', password: 'Whatever123' });

    const wrongPassword = await api(app)
      .post('/api/auth/sign-in')
      .send({ email: 'anna@example.com', password: 'WrongPass123' });

    expect(unknownAddress.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(unknownAddress.body).toEqual(wrongPassword.body);
    expect(unknownAddress.body).toEqual({ message: 'Invalid credentials.' });
  });

  it('answers 401 with the same message for a malformed address, without calling auth', async () => {
    const response = await api(app)
      .post('/api/auth/sign-in')
      .send({ email: 'not-an-email', password: 'Whatever123' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Invalid credentials.' });
    expect(authClientSpies.signInWithPassword).not.toHaveBeenCalled();
  });

  it('never returns tokens in the body and sets both session cookies as httpOnly', async () => {
    authClientSpies.signInWithPassword.mockResolvedValue({
      data: { session: makeSession(), user: { id: 'user-1' } },
      error: null
    });

    const response = await api(app).post('/api/auth/sign-in').send(credentials);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(JSON.stringify(response.body)).not.toContain('new-access-token');

    const jar = parseSetCookie(response);
    expect(jar[ACCESS_COOKIE].value).toBe('new-access-token');
    expect(jar[REFRESH_COOKIE].value).toBe('new-refresh-token');
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
      expect(hasAttr(jar[name], 'httponly')).toBe(true);
      expect(attrValue(jar[name], 'samesite')).toBe('lax');
    }
  });
});

/* ------------------------------------------------------------------ */
/* 7.3.1  Password recovery — uniform 200                               */
/* ------------------------------------------------------------------ */

describe('POST /api/auth/forgot-password', () => {
  it('answers 200 identically whether or not the address has an account', async () => {
    const unknown = await api(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });
    const known = await api(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'anna@example.com' });

    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
  });

  it('does not reach the auth module for a malformed address, but still answers 200', async () => {
    const response = await api(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'not-an-email' });

    expect(response.status).toBe(200);
    expect(authClientSpies.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* 7.3.1  Registration — validation precedes any write                  */
/* ------------------------------------------------------------------ */

describe('POST /api/auth/sign-up', () => {
  const valid = {
    email: 'nowa@example.com',
    // Not 'Password123': the policy now rejects breached passwords, and this
    // fixture is about the sign-up path, not about the policy.
    password: 'Zielony8Kamien',
    firstName: 'Anna',
    lastName: 'Kowalska',
    phoneNumber: '+48111222333'
  };

  it('rejects a single-character first name with 400 without calling the auth module', async () => {
    const response = await api(app)
      .post('/api/auth/sign-up')
      .send({ ...valid, firstName: 'A' });

    expect(response.status).toBe(400);
    // The ordering assertion is the point: validation runs before any write, so a
    // rejected request cannot leave a half-created account behind.
    expect(authClientSpies.signUp).not.toHaveBeenCalled();
    expect(createSupabaseAuthClient).not.toHaveBeenCalled();
  });

  it('rejects a weak password with 400 without calling the auth module', async () => {
    const weak = ['Ab1', 'Passw0r', 'Password', 'password123', 'PASSWORD123', ''];

    for (const password of weak) {
      const response = await api(app).post('/api/auth/sign-up').send({ ...valid, password });

      expect(response.status, `"${password}"`).toBe(400);
    }

    expect(authClientSpies.signUp).not.toHaveBeenCalled();
  });

  it('answers 201 and asks for email confirmation when no session is issued', async () => {
    authClientSpies.signUp.mockResolvedValue({
      data: { user: { id: 'user-9' }, session: null },
      error: null
    });

    const response = await api(app).post('/api/auth/sign-up').send(valid);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ ok: true, requiresEmailConfirmation: true });
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('never forwards a caller-supplied role to the auth module', async () => {
    authClientSpies.signUp.mockResolvedValue({
      data: { user: { id: 'user-9' }, session: null },
      error: null
    });

    await api(app)
      .post('/api/auth/sign-up')
      .send({ ...valid, role: 'admin' });

    const [[payload]] = authClientSpies.signUp.mock.calls;
    expect(JSON.stringify(payload)).not.toContain('admin');
  });
});

/* ------------------------------------------------------------------ */
/* 7.3.1  Session establishment — three abuses                          */
/* ------------------------------------------------------------------ */

describe('POST /api/auth/session', () => {
  it('rejects empty tokens with 401 before reaching the auth module', async () => {
    const response = await api(app)
      .post('/api/auth/session')
      .send({ accessToken: '', refreshToken: '' });

    expect(response.status).toBe(401);
    expect(supabaseAdmin.auth.getUser).not.toHaveBeenCalled();
    expect(authClientSpies.refreshSession).not.toHaveBeenCalled();
  });

  it('rejects tokens longer than 8192 characters before reaching the auth module', async () => {
    const oversized = 'a'.repeat(8193);

    const response = await api(app)
      .post('/api/auth/session')
      .send({ accessToken: oversized, refreshToken: oversized });

    expect(response.status).toBe(401);
    expect(supabaseAdmin.auth.getUser).not.toHaveBeenCalled();
  });

  it('rejects an access token paired with another user\'s refresh token', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-A' } },
      error: null
    });
    authClientSpies.refreshSession.mockResolvedValue({
      data: { session: makeSession(), user: { id: 'user-B' } },
      error: null
    });

    const response = await api(app)
      .post('/api/auth/session')
      .send({ accessToken: 'token-of-A', refreshToken: 'token-of-B' });

    // Proves both tokens are validated as one pair, not independently.
    expect(response.status).toBe(401);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('issues a fresh cookie pair when both tokens belong to the same user', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-A' } },
      error: null
    });
    authClientSpies.refreshSession.mockResolvedValue({
      data: { session: makeSession(), user: { id: 'user-A' } },
      error: null
    });

    const response = await api(app)
      .post('/api/auth/session')
      .send({ accessToken: 'token-of-A', refreshToken: 'refresh-of-A' });

    expect(response.status).toBe(200);
    const jar = parseSetCookie(response);
    expect(jar[ACCESS_COOKIE].value).toBe('new-access-token');
    expect(jar[REFRESH_COOKIE].value).toBe('new-refresh-token');
    expect(hasAttr(jar[ACCESS_COOKIE], 'httponly')).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* 7.3.1  Password change                                               */
/* ------------------------------------------------------------------ */

describe('POST /api/auth/reset-password', () => {
  it('requires a session', async () => {
    const response = await api(app)
      .post('/api/auth/reset-password')
      .send({ password: 'BrandNew123' });

    expect(response.status).toBe(401);
  });

  it('rejects a weak password with 400', async () => {
    signedInAs({ id: 'user-1' });

    const response = await api(app, { cookies: sessionCookies() })
      .post('/api/auth/reset-password')
      .send({ password: 'weak' });

    expect(response.status).toBe(400);
    expect(supabaseAdmin.auth.admin.updateUserById).not.toHaveBeenCalled();
  });

  /**
   * Pinned to the admin API on purpose.
   *
   * The change used to be attempted through a client carrying the caller's JWT
   * as a header, which is enough for a table read but not for a password
   * change: that call wants a session the client does not hold on a server, so
   * every attempt came back 400. Mocking it kept the suite green while the
   * feature was broken in the browser, so the call itself is asserted here.
   */
  it('changes the password of the caller, through the admin API', async () => {
    signedInAs({ id: 'user-1' });

    const response = await api(app, { cookies: sessionCookies() })
      .post('/api/auth/reset-password')
      .send({ password: 'BrandNew123' });

    expect(response.status).toBe(200);
    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('user-1', {
      password: 'BrandNew123'
    });
  });

  it('reports a failure from the auth provider as 400', async () => {
    signedInAs({ id: 'user-1' });
    supabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
      data: { user: null },
      error: { message: 'nope' }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .post('/api/auth/reset-password')
      .send({ password: 'BrandNew123' });

    expect(response.status).toBe(400);
  });
});
