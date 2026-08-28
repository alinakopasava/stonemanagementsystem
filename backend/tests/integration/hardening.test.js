import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/config/supabase.js', () => import('../setup/supabase-mock.js'));

const { app } = await import('../../src/app.js');
const { api, resetSupabaseMock, setTables } = await import('../setup/harness.js');

/**
 * The hardening added after the security review: response headers, the contact
 * honeypot, and the breached-password rule at the HTTP boundary.
 */

beforeEach(() => {
  resetSupabaseMock();
});

/* ------------------------------------------------------------------ */
/* Response headers                                                     */
/* ------------------------------------------------------------------ */

describe('security headers', () => {
  it('tells the browser not to sniff the content type', async () => {
    const response = await api(app).get('/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('forbids framing, so the admin panel cannot be clickjacked', async () => {
    const response = await api(app).get('/health');

    // Both mechanisms, because older browsers only honour the header.
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  it('leaks neither the referrer nor the server stack', async () => {
    const response = await api(app).get('/health');

    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('asks for https on every later visit', async () => {
    const response = await api(app).get('/health');

    expect(response.headers['strict-transport-security']).toContain('max-age=');
  });

  it('sets them on API answers, not only on the health probe', async () => {
    setTables({ materials: { select: () => ({ data: [], error: null }) } });

    const response = await api(app).get('/api/materials');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});

/* ------------------------------------------------------------------ */
/* Contact honeypot                                                     */
/* ------------------------------------------------------------------ */

describe('POST /api/contact — honeypot', () => {
  const validMessage = {
    name: 'Anna Kowalska',
    email: 'anna@example.com',
    message: 'Proszę o wycenę pomnika.'
  };

  it('stores a message that leaves the trap empty', async () => {
    const inserts = [];
    setTables({
      contact_messages: {
        insert: (ctx) => (
          inserts.push(ctx.payload),
          { data: { id: 'msg-1', created_at: '2026-08-28T10:00:00Z' }, error: null }
        )
      }
    });

    const response = await api(app).post('/api/contact').send(validMessage);

    expect(response.status).toBe(201);
    expect(inserts).toHaveLength(1);
  });

  it('drops a message that filled the trap in', async () => {
    const inserts = [];
    setTables({
      contact_messages: {
        insert: (ctx) => (inserts.push(ctx.payload), { data: { id: 'msg-1' }, error: null })
      }
    });

    const response = await api(app)
      .post('/api/contact')
      .send({ ...validMessage, website: 'http://spam.example' });

    // The answer is deliberately indistinguishable from a real one: an error
    // would tell the author which field gave them away.
    expect(response.status).toBe(201);
    expect(inserts).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* Breached passwords at the boundary                                   */
/* ------------------------------------------------------------------ */

describe('POST /api/auth/sign-up — breached passwords', () => {
  const registration = {
    email: 'nowa@example.com',
    firstName: 'Anna',
    lastName: 'Kowalska'
  };

  it('refuses a password from the top of every breach corpus', async () => {
    const response = await api(app)
      .post('/api/auth/sign-up')
      .send({ ...registration, password: 'Password123' });

    expect(response.status).toBe(400);
    // The form already enforces length and character classes, so a generic
    // message would leave the user retyping something that looks compliant.
    expect(response.body.message).toMatch(/commonly used/i);
  });

  it('says nothing specific about a password that fails the visible rules', async () => {
    const response = await api(app)
      .post('/api/auth/sign-up')
      .send({ ...registration, password: 'weak' });

    expect(response.status).toBe(400);
    expect(response.body.message).not.toMatch(/commonly used/i);
  });
});
