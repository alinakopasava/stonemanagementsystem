import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/config/supabase.js', () => import('../setup/supabase-mock.js'));

const { app } = await import('../../src/app.js');
const { supabaseAdmin } = await import('../setup/supabase-mock.js');
const {
  api,
  sessionCookies,
  makeProfile,
  resetSupabaseMock,
  setTables,
  stubAuditLogs
} = await import('../setup/harness.js');

const validMessage = {
  name: 'Anna Kowalska',
  email: 'anna@example.com',
  phone: '+48111222333',
  message: 'Proszę o wycenę pomnika z gabro.'
};

const captureContactInserts = () => {
  const inserts = [];
  setTables({
    contact_messages: {
      insert: (ctx) => (
        inserts.push(ctx.payload),
        { data: { id: 'msg-1', created_at: '2026-08-25T10:00:00.000Z' }, error: null }
      )
    }
  });
  return inserts;
};

beforeEach(() => {
  resetSupabaseMock();
  stubAuditLogs();
});

/* ------------------------------------------------------------------ */
/* 7.3.5  Contact form — the only unauthenticated write                 */
/* ------------------------------------------------------------------ */

describe('POST /api/contact', () => {
  it.each([
    ['name', { name: '' }],
    ['email', { email: '' }],
    ['message', { message: '' }]
  ])('rejects a missing %s with 400', async (_field, override) => {
    captureContactInserts();

    const response = await api(app)
      .post('/api/contact')
      .send({ ...validMessage, ...override });

    expect(response.status).toBe(400);
  });

  it.each([
    'not-an-email',
    'missing@domain',
    '@example.com',
    'spaces in@example.com'
  ])('rejects the malformed address %s with 400', async (email) => {
    captureContactInserts();

    const response = await api(app)
      .post('/api/contact')
      .send({ ...validMessage, email });

    expect(response.status).toBe(400);
  });

  it.each([
    ['name', 'name', 120],
    ['email', 'email', 200],
    ['phone', 'phone', 40],
    ['message', 'message', 4000]
  ])('enforces the %s length limit of %i characters', async (_label, field, limit) => {
    captureContactInserts();

    // A valid-looking value of exactly `limit` characters, and one character more.
    const fill = (length) =>
      field === 'email'
        ? `${'a'.repeat(length - '@example.com'.length)}@example.com`
        : 'x'.repeat(length);

    const atLimit = await api(app)
      .post('/api/contact')
      .send({ ...validMessage, [field]: fill(limit) });
    const overLimit = await api(app)
      .post('/api/contact')
      .send({ ...validMessage, [field]: fill(limit + 1) });

    expect(atLimit.status).toBe(201);
    expect(overLimit.status).toBe(400);
  });

  it('stores an empty phone number as an undefined value, not an empty string', async () => {
    const inserts = captureContactInserts();

    const response = await api(app)
      .post('/api/contact')
      .send({ ...validMessage, phone: '   ' });

    expect(response.status).toBe(201);
    // Keeps the table free of rows that look like they carry contact details
    // but hold an empty string.
    expect(inserts[0].phone).toBeNull();
  });

  it('trims surrounding whitespace before storing', async () => {
    const inserts = captureContactInserts();

    await api(app)
      .post('/api/contact')
      .send({ ...validMessage, name: '  Anna Kowalska  ' });

    expect(inserts[0].name).toBe('Anna Kowalska');
  });

  it('accepts a well-formed message without any session', async () => {
    captureContactInserts();

    const response = await api(app).post('/api/contact').send(validMessage);

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe('msg-1');
  });
});

/* ------------------------------------------------------------------ */
/* 7.3.5  Message triage in the admin panel                             */
/* ------------------------------------------------------------------ */

describe('PATCH /api/admin/contact-messages/:id', () => {
  const asAdmin = () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1' } },
      error: null
    });
    setTables({
      profiles: {
        select: () => ({ data: makeProfile({ id: 'admin-1', role: 'admin' }), error: null })
      }
    });
  };

  it('records the moment and the author when a message is marked read', async () => {
    asAdmin();
    const updates = [];
    setTables({
      contact_messages: {
        update: (ctx) => (updates.push(ctx.payload), { data: { id: 'msg-1', ...ctx.payload }, error: null })
      }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .patch('/api/admin/contact-messages/msg-1')
      .send({ status: 'read' });

    expect(response.status).toBe(200);
    expect(updates[0].status).toBe('read');
    expect(updates[0].read_at).toEqual(expect.any(String));
    expect(updates[0].read_by).toBe('admin-1');
  });

  it('clears those fields again when the message is archived', async () => {
    asAdmin();
    const updates = [];
    setTables({
      contact_messages: {
        update: (ctx) => (updates.push(ctx.payload), { data: { id: 'msg-1', ...ctx.payload }, error: null })
      }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .patch('/api/admin/contact-messages/msg-1')
      .send({ status: 'archived' });

    expect(response.status).toBe(200);
    // Lets an archived message be told apart from one that was merely read.
    expect(updates[0].read_at).toBeNull();
    expect(updates[0].read_by).toBeNull();
  });

  it('rejects a status outside the defined set with 400', async () => {
    asAdmin();

    const response = await api(app, { cookies: sessionCookies() })
      .patch('/api/admin/contact-messages/msg-1')
      .send({ status: 'spam' });

    expect(response.status).toBe(400);
  });
});

/* ------------------------------------------------------------------ */
/* 7.3.5  Public resources                                              */
/* ------------------------------------------------------------------ */

describe('public resources', () => {
  it('answers the liveness probe with a fixed response', async () => {
    const response = await api(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('serves the material catalogue without a session cookie', async () => {
    setTables({
      materials: {
        select: () => ({
          data: [
            {
              id: 'mat-1',
              name: 'Gabbro-Diabase',
              category: 'Stone',
              price_per_m2: 420,
              stock_status: true,
              image_url: null
            }
          ],
          error: null
        })
      }
    });

    const response = await api(app).get('/api/materials');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it('serves the product catalogue without a session cookie', async () => {
    setTables({ products: { select: () => ({ data: [], error: null }) } });

    const response = await api(app).get('/api/products');

    expect(response.status).toBe(200);
  });

  it('rejects a body larger than 100 kB with 413 before any handler runs', async () => {
    const inserts = [];
    setTables({
      contact_messages: { insert: (ctx) => (inserts.push(ctx.payload), { data: { id: 'x' }, error: null }) }
    });

    const response = await api(app)
      .post('/api/contact')
      .send({ ...validMessage, message: 'x'.repeat(150 * 1024) });

    expect(response.status).toBe(413);
    expect(inserts).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* Cross-site request forgery guard                                     */
/* ------------------------------------------------------------------ */

describe('requireTrustedOrigin', () => {
  it('rejects an unsafe method from a foreign origin with 403', async () => {
    const response = await api(app, { origin: 'https://evil.example.com' })
      .post('/api/contact')
      .send(validMessage);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: 'Forbidden origin.' });
  });

  it('rejects a cookie-bearing request that carries no Origin at all', async () => {
    const response = await api(app, { origin: null, cookies: sessionCookies() })
      .post('/api/contact')
      .send(validMessage);

    expect(response.status).toBe(403);
  });

  it('allows a safe method from a foreign origin', async () => {
    const response = await api(app, { origin: 'https://evil.example.com' }).get('/health');

    expect(response.status).toBe(200);
  });

  it('allows a cookie-free request with no Origin (non-browser API client)', async () => {
    captureContactInserts();

    const response = await api(app, { origin: null }).post('/api/contact').send(validMessage);

    expect(response.status).toBe(201);
  });
});
