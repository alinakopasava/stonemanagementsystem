import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/config/supabase.js', () => import('../setup/supabase-mock.js'));

const { app } = await import('../../src/app.js');
const { supabaseAdmin, authClientSpies } = await import('../setup/supabase-mock.js');
const {
  api,
  sessionCookies,
  makeProfile,
  resetSupabaseMock,
  setTables,
  stubAuditLogs
} = await import('../setup/harness.js');

/**
 * Each limiter keeps one counter per client IP for the lifetime of the worker,
 * so every case below pins its own IP. Reusing one would make the cases
 * interfere and the failures would look like limiter bugs.
 */
let limiterIpCounter = 0;
const pinnedIp = () => `172.16.${limiterIpCounter >> 8 & 0xff}.${(limiterIpCounter++ & 0xff) + 1}`;

/** Fires `count` sequential requests from one IP and returns every response. */
const burst = async (count, send) => {
  const ip = pinnedIp();
  const responses = [];
  for (let i = 0; i < count; i += 1) {
    responses.push(await send(api(app, { fixedIp: ip })));
  }
  return responses;
};

beforeEach(() => {
  resetSupabaseMock();
  stubAuditLogs();
});

/* ------------------------------------------------------------------ */
/* 7.3.6  Request rate limiting — table 7.4                             */
/* ------------------------------------------------------------------ */

describe('rate limiting', () => {
  it('allows 100 requests to the API in 10 s and refuses the 101st', async () => {
    const responses = await burst(101, (client) => client.get('/health'));

    expect(responses.slice(0, 100).every((r) => r.status === 200)).toBe(true);
    expect(responses[100].status).toBe(429);
  });

  it('allows 5 sign-in attempts a minute and refuses the 6th', async () => {
    authClientSpies.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' }
    });

    const responses = await burst(6, (client) =>
      client.post('/api/auth/sign-in').send({ email: 'anna@example.com', password: 'Wrong123' })
    );

    expect(responses.slice(0, 5).every((r) => r.status === 401)).toBe(true);
    expect(responses[5].status).toBe(429);
    // Guessing a password stops being worthwhile long before it becomes feasible.
    expect(responses[5].body).toEqual({ message: 'Too many attempts. Try again later.' });
  });

  it('allows 3 registrations a minute and refuses the 4th', async () => {
    authClientSpies.signUp.mockResolvedValue({
      data: { user: { id: 'u' }, session: null },
      error: null
    });

    const responses = await burst(4, (client) =>
      client.post('/api/auth/sign-up').send({
        email: 'nowa@example.com',
        password: 'Password123',
        firstName: 'Anna',
        lastName: 'Kowalska'
      })
    );

    expect(responses.slice(0, 3).every((r) => r.status === 201)).toBe(true);
    expect(responses[3].status).toBe(429);
  });

  it('allows 3 password operations a minute and refuses the 4th', async () => {
    const responses = await burst(4, (client) =>
      client.post('/api/auth/forgot-password').send({ email: 'anna@example.com' })
    );

    expect(responses.slice(0, 3).every((r) => r.status === 200)).toBe(true);
    expect(responses[3].status).toBe(429);
  });

  it('allows 10 session renewals a minute and refuses the 11th', async () => {
    const responses = await burst(11, (client) =>
      client.post('/api/auth/session').send({ accessToken: '', refreshToken: '' })
    );

    expect(responses.slice(0, 10).every((r) => r.status === 401)).toBe(true);
    expect(responses[10].status).toBe(429);
  });

  it('allows 3 contact messages a minute and refuses the 4th', async () => {
    setTables({
      contact_messages: {
        insert: () => ({ data: { id: 'msg', created_at: '2026-08-25T10:00:00Z' }, error: null })
      }
    });

    const responses = await burst(4, (client) =>
      client.post('/api/contact').send({
        name: 'Anna',
        email: 'anna@example.com',
        message: 'Dzień dobry'
      })
    );

    expect(responses.slice(0, 3).every((r) => r.status === 201)).toBe(true);
    expect(responses[3].status).toBe(429);
  });

  it('allows 8 order submissions a minute and refuses the 9th', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });
    setTables({
      profiles: { select: () => ({ data: makeProfile({ id: 'user-1' }), error: null }) },
      order_cards: {
        insert: () => ({ data: { id: 'card', user_id: 'user-1' }, error: null }),
        delete: () => ({ data: null, error: null })
      },
      order_details: { insert: (ctx) => ({ data: { id: 'd', ...ctx.payload }, error: null }) }
    });

    const responses = await burst(9, (client) =>
      client
        .post('/api/orders/submit')
        .set('Cookie', sessionCookies())
        .send({
          materialId: '3f0d9a1e-4c2b-4f8a-9e7d-1b2c3d4e5f60',
          dimensions: '100x60',
          inscriptionText: 'Pamięci',
          finishType: 'Polished'
        })
    );

    expect(responses.slice(0, 8).every((r) => r.status === 201)).toBe(true);
    expect(responses[8].status).toBe(429);
  });

  /* ---------------------------------------------------------------- */

  it('advertises the limit, the remaining budget and the reset moment', async () => {
    authClientSpies.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' }
    });

    const [first, second] = await burst(2, (client) =>
      client.post('/api/auth/sign-in').send({ email: 'anna@example.com', password: 'Wrong123' })
    );

    // These let the client app say "try again in a minute" instead of showing a
    // generic failure.
    expect(first.headers['ratelimit-limit']).toBe('5');
    expect(first.headers['ratelimit-remaining']).toBe('4');
    expect(second.headers['ratelimit-remaining']).toBe('3');
    expect(Number(first.headers['ratelimit-reset'])).toBeGreaterThan(0);
  });

  it('counts each client IP separately', async () => {
    authClientSpies.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' }
    });

    const attacker = await burst(6, (client) =>
      client.post('/api/auth/sign-in').send({ email: 'anna@example.com', password: 'Wrong123' })
    );
    expect(attacker[5].status).toBe(429);

    // A different visitor must not inherit the exhausted budget.
    const bystander = await api(app, { fixedIp: pinnedIp() })
      .post('/api/auth/sign-in')
      .send({ email: 'anna@example.com', password: 'Wrong123' });

    expect(bystander.status).toBe(401);
  });
});
