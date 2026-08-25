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

const ADMIN_ID = 'admin-1';

const asAdmin = () => {
  supabaseAdmin.auth.getUser.mockResolvedValue({ data: { user: { id: ADMIN_ID } }, error: null });
  setTables({
    profiles: {
      select: (ctx) =>
        ctx.maybeSingle
          ? { data: makeProfile({ id: ADMIN_ID, role: 'admin' }), error: null }
          : { data: [makeProfile({ id: ADMIN_ID, role: 'admin' })], error: null }
    }
  });
};

const auditEntries = () => {
  const entries = [];
  setTables({
    audit_logs: { insert: (ctx) => (entries.push(ctx.payload), { data: { id: 'a' }, error: null }) }
  });
  return entries;
};

beforeEach(() => {
  resetSupabaseMock();
  stubAuditLogs();
});

/* ------------------------------------------------------------------ */
/* 7.3.4  Role management                                               */
/* ------------------------------------------------------------------ */

describe('PATCH /api/admin/users/:id/role', () => {
  it('rejects a role outside the defined set with 400', async () => {
    asAdmin();
    const writes = [];
    setTables({
      profiles: {
        select: (ctx) =>
          ctx.maybeSingle
            ? { data: makeProfile({ id: ADMIN_ID, role: 'admin' }), error: null }
            : { data: [], error: null },
        update: (ctx) => (writes.push(ctx.payload), { data: null, error: null })
      }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .patch('/api/admin/users/other-user/role')
      .send({ role: 'superadmin' });

    expect(response.status).toBe(400);
    // Closes the door on privilege escalation by inventing a role name.
    expect(writes).toHaveLength(0);
  });

  it('refuses to let an admin strip their own admin role, with 400', async () => {
    asAdmin();
    const writes = [];
    setTables({
      profiles: {
        select: (ctx) =>
          ctx.maybeSingle
            ? { data: makeProfile({ id: ADMIN_ID, role: 'admin' }), error: null }
            : { data: [], error: null },
        update: (ctx) => (writes.push(ctx.payload), { data: null, error: null })
      }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .patch(`/api/admin/users/${ADMIN_ID}/role`)
      .send({ role: 'klient' });

    // Guards against locking the last administrator out of the panel, which
    // would otherwise need manual repair straight in the database.
    expect(response.status).toBe(400);
    expect(writes).toHaveLength(0);
  });

  it('changes another user\'s role and records it in the audit log', async () => {
    asAdmin();
    const entries = auditEntries();
    setTables({
      profiles: {
        select: (ctx) =>
          ctx.maybeSingle
            ? { data: makeProfile({ id: ADMIN_ID, role: 'admin' }), error: null }
            : { data: [], error: null },
        update: () => ({ data: { id: 'other-user', role: 'monter' }, error: null })
      }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .patch('/api/admin/users/other-user/role')
      .send({ role: 'monter' });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ id: 'other-user', role: 'monter' });

    const entry = entries.find((e) => e.action === 'user.role_changed');
    expect(entry).toBeDefined();
    expect(entry.actor_id).toBe(ADMIN_ID);
    expect(entry.entity_id).toBe('other-user');
    expect(entry.metadata).toEqual({ role: 'monter' });
  });

  it('lets an admin keep their own admin role (the self-check is not a blanket ban)', async () => {
    asAdmin();
    setTables({
      profiles: {
        select: (ctx) =>
          ctx.maybeSingle
            ? { data: makeProfile({ id: ADMIN_ID, role: 'admin' }), error: null }
            : { data: [], error: null },
        update: () => ({ data: { id: ADMIN_ID, role: 'admin' }, error: null })
      }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .patch(`/api/admin/users/${ADMIN_ID}/role`)
      .send({ role: 'admin' });

    expect(response.status).toBe(200);
  });
});

/* ------------------------------------------------------------------ */
/* 7.3.4  Order status                                                  */
/* ------------------------------------------------------------------ */

describe('PATCH /api/admin/orders/:id/status', () => {
  it('rejects a status outside the defined lifecycle with 400', async () => {
    asAdmin();

    const response = await api(app, { cookies: sessionCookies() })
      .patch('/api/admin/orders/order-1/status')
      .send({ status: 'wysłane_pocztą' });

    expect(response.status).toBe(400);
  });

  it.each(['oczekujące', 'w_realizacji', 'zrealizowane', 'anulowane'])(
    'accepts the %s status',
    async (status) => {
      asAdmin();
      setTables({
        orders: { update: () => ({ data: { id: 'order-1', status }, error: null }) }
      });

      const response = await api(app, { cookies: sessionCookies() })
        .patch('/api/admin/orders/order-1/status')
        .send({ status });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(status);
    }
  );
});

/* ------------------------------------------------------------------ */
/* 7.3.4  Converting a card into a production order — five cases        */
/* ------------------------------------------------------------------ */

describe('POST /api/admin/order-cards/:id/convert', () => {
  const cardFound = (overrides = {}) => ({
    order_cards: {
      select: () => ({ data: { id: 'card-1', user_id: 'user-1' }, error: null }),
      ...overrides
    }
  });

  it('answers 400 when the card does not exist', async () => {
    asAdmin();
    setTables({
      order_cards: { select: () => ({ data: null, error: { message: 'not found' } }) }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .post('/api/admin/order-cards/missing/convert')
      .send({ price: 1000 });

    expect(response.status).toBe(400);
  });

  it('answers 409 when the card was already converted', async () => {
    asAdmin();
    setTables({
      ...cardFound(),
      orders: { select: () => ({ data: { id: 'existing-order' }, error: null }) }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .post('/api/admin/order-cards/card-1/convert')
      .send({ price: 1000 });

    // 409 rather than 400: the request is well formed, it is the state of the
    // resource that blocks it — so the UI can say "already handled, perhaps by
    // a colleague" instead of showing a validation error.
    expect(response.status).toBe(409);
  });

  it('answers 400 for a negative price', async () => {
    asAdmin();
    setTables({
      ...cardFound(),
      orders: { select: () => ({ data: null, error: null }) }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .post('/api/admin/order-cards/card-1/convert')
      .send({ price: -1 });

    expect(response.status).toBe(400);
  });

  it('stores an empty price as an undefined value', async () => {
    asAdmin();
    const inserts = [];
    setTables({
      ...cardFound(),
      orders: {
        select: () => ({ data: null, error: null }),
        insert: (ctx) => (inserts.push(ctx.payload), { data: { id: 'order-1', ...ctx.payload }, error: null })
      }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .post('/api/admin/order-cards/card-1/convert')
      .send({ price: '' });

    expect(response.status).toBe(201);
    expect(inserts[0].price).toBeNull();
  });

  it('answers 201 with the initial status on a correct conversion', async () => {
    asAdmin();
    const entries = auditEntries();
    const inserts = [];
    setTables({
      ...cardFound(),
      orders: {
        select: () => ({ data: null, error: null }),
        insert: (ctx) => (inserts.push(ctx.payload), { data: { id: 'order-1', ...ctx.payload }, error: null })
      }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .post('/api/admin/order-cards/card-1/convert')
      .send({
        price: 2500,
        installation_address: 'ul. Kwiatowa 1, Mińsk',
        deadline: '2026-12-01',
        client_full_name: 'Anna Kowalska'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('oczekujące');
    // The order inherits the card's owner, not the acting admin.
    expect(inserts[0].user_id).toBe('user-1');
    expect(inserts[0].order_card_id).toBe('card-1');
    expect(entries.some((e) => e.action === 'order_card.converted')).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* 7.3.4  Card list filter                                              */
/* ------------------------------------------------------------------ */

describe('GET /api/admin/order-cards', () => {
  const twoCards = () => ({
    order_cards: {
      select: () => ({
        data: [
          { id: 'card-converted', user_id: 'user-1', order_details: [] },
          { id: 'card-pending', user_id: 'user-2', order_details: [] }
        ],
        error: null
      })
    },
    orders: {
      select: () => ({
        data: [{ id: 'order-1', order_card_id: 'card-converted', status: 'oczekujące' }],
        error: null
      })
    }
  });

  it('returns only unconverted cards when asked for pending ones', async () => {
    asAdmin();
    setTables(twoCards());

    const response = await api(app, { cookies: sessionCookies() }).get(
      '/api/admin/order-cards?converted=false'
    );

    expect(response.status).toBe(200);
    expect(response.body.data.map((c) => c.id)).toEqual(['card-pending']);
    expect(response.body.data[0].converted_order).toBeNull();
  });

  it('returns only converted cards when asked for those', async () => {
    asAdmin();
    setTables(twoCards());

    const response = await api(app, { cookies: sessionCookies() }).get(
      '/api/admin/order-cards?converted=true'
    );

    expect(response.status).toBe(200);
    expect(response.body.data.map((c) => c.id)).toEqual(['card-converted']);
  });

  it('returns every card when no filter is given', async () => {
    asAdmin();
    setTables(twoCards());

    const response = await api(app, { cookies: sessionCookies() }).get('/api/admin/order-cards');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
  });
});
