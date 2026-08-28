import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/config/supabase.js', () => import('../setup/supabase-mock.js'));

const { app } = await import('../../src/app.js');
const { onQuery } = await import('../setup/supabase-mock.js');
const {
  api,
  sessionCookies,
  signedInAs,
  resetSupabaseMock,
  setTables
} = await import('../setup/harness.js');

const MATERIAL_ID = '3f0d9a1e-4c2b-4f8a-9e7d-1b2c3d4e5f60';

const validPayload = {
  materialId: MATERIAL_ID,
  dimensions: '100x60',
  inscriptionText: 'Śp. Anna Kowalska',
  finishType: 'Polished'
};

/** Happy-path table handlers: card insert succeeds, details insert succeeds. */
const workingTables = () => {
  setTables({
    order_cards: {
      insert: (ctx) => ({ data: { id: 'card-1', user_id: ctx.payload.user_id }, error: null }),
      delete: () => ({ data: null, error: null })
    },
    order_details: {
      insert: (ctx) => ({ data: { id: 'details-1', ...ctx.payload }, error: null })
    }
  });
};

beforeEach(() => {
  resetSupabaseMock();
});

/* ------------------------------------------------------------------ */
/* 7.3.3  Order card assembly                                           */
/* ------------------------------------------------------------------ */

describe('POST /api/orders/submit', () => {
  it('rejects a request without a session with 401', async () => {
    const response = await api(app).post('/api/orders/submit').send(validPayload);

    expect(response.status).toBe(401);
  });

  describe('field validation', () => {
    beforeEach(() => {
      signedInAs({ id: 'user-1' });
      workingTables();
    });

    it('rejects every malformed field with 400', async () => {
      const malformed = [
        { materialId: 'not-a-uuid' },
        { materialId: '' },
        { dimensions: '100 by 60' },
        { dimensions: '' },
        { finishType: 'Brushed' },
        { inscriptionText: '   ' }
      ];

      for (const override of malformed) {
        const response = await api(app, { cookies: sessionCookies() })
          .post('/api/orders/submit')
          .send({ ...validPayload, ...override });

        expect(response.status, JSON.stringify(override)).toBe(400);
      }
    });

    it('rejects an inscription longer than 4000 characters with 400', async () => {
      const response = await api(app, { cookies: sessionCookies() })
        .post('/api/orders/submit')
        .send({ ...validPayload, inscriptionText: 'x'.repeat(4001) });

      expect(response.status).toBe(400);
    });

    it('accepts an inscription of exactly 4000 characters', async () => {
      const response = await api(app, { cookies: sessionCookies() })
        .post('/api/orders/submit')
        .send({ ...validPayload, inscriptionText: 'x'.repeat(4000) });

      expect(response.status).toBe(201);
    });

    it('accepts each of the three finishes', async () => {
      for (const finishType of ['Polished', 'Matte', 'Honed']) {
        const response = await api(app, { cookies: sessionCookies() })
          .post('/api/orders/submit')
          .send({ ...validPayload, finishType });

        expect(response.status, finishType).toBe(201);
      }
    });

    it('writes no rows at all when validation fails', async () => {
      const queries = [];
      onQuery((ctx) => queries.push(ctx));

      await api(app, { cookies: sessionCookies() })
        .post('/api/orders/submit')
        .send({ ...validPayload, materialId: 'not-a-uuid' });

      expect(queries.filter((q) => q.op === 'insert')).toHaveLength(0);
    });
  });

  it('ignores a user id supplied in the body and files the card under the session owner', async () => {
    signedInAs({ id: 'user-1' });
    const inserts = [];
    setTables({
      order_cards: {
        insert: (ctx) => (inserts.push(ctx.payload), { data: { id: 'card-1' }, error: null }),
        delete: () => ({ data: null, error: null })
      },
      order_details: { insert: (ctx) => ({ data: { id: 'details-1', ...ctx.payload }, error: null }) }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .post('/api/orders/submit')
      .send({ ...validPayload, user_id: 'victim-user', userId: 'victim-user' });

    expect(response.status).toBe(201);
    // The identity comes from the session token, never from the request body,
    // so an order cannot be filed against somebody else's account.
    expect(inserts[0].user_id).toBe('user-1');
    expect(inserts[0].user_id).not.toBe('victim-user');
  });

  it('deletes the created card when the technical details fail to save', async () => {
    signedInAs({ id: 'user-1' });
    const deletes = [];
    setTables({
      order_cards: {
        insert: () => ({ data: { id: 'card-1', user_id: 'user-1' }, error: null }),
        delete: (ctx) => (deletes.push(ctx.filters), { data: null, error: null })
      },
      order_details: {
        insert: () => ({ data: null, error: { message: 'constraint violation' } })
      }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .post('/api/orders/submit')
      .send(validPayload);

    expect(response.status).toBe(400);
    // Without the rollback the panel would show a card with no technical
    // parameters — an order nobody can actually produce.
    expect(deletes).toHaveLength(1);
    expect(deletes[0]).toContainEqual({ type: 'eq', column: 'id', value: 'card-1' });
  });

  it('returns 201 with the stored card and details on the happy path', async () => {
    signedInAs({ id: 'user-1' });
    workingTables();

    const response = await api(app, { cookies: sessionCookies() })
      .post('/api/orders/submit')
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.data.orderCard.id).toBe('card-1');
    expect(response.body.data.orderDetails).toMatchObject({
      material_id: MATERIAL_ID,
      dimensions: '100x60',
      finish_type: 'Polished'
    });
  });

  it('uses the RLS-bound per-request client, never the service role', async () => {
    signedInAs({ id: 'user-1' });
    const clients = new Set();
    onQuery((ctx) => clients.add(`${ctx.client}:${ctx.table}`));
    workingTables();

    await api(app, { cookies: sessionCookies() }).post('/api/orders/submit').send(validPayload);

    expect(clients).toContain('user:order_cards');
    expect(clients).toContain('user:order_details');
    expect([...clients]).not.toContain('admin:order_cards');
  });
});
