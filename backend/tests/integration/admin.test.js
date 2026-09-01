import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/config/supabase.js', () => import('../setup/supabase-mock.js'));

const { app } = await import('../../src/app.js');
const { supabaseAdmin } = await import('../setup/supabase-mock.js');
const {
  api,
  sessionCookies,
  makeProfile,
  resetSupabaseMock,
  setTables
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

beforeEach(() => {
  resetSupabaseMock();
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

  it('changes another user\'s role', async () => {
    asAdmin();
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

  it('accepts every status of the lifecycle', async () => {
    for (const status of ['oczekujące', 'w_realizacji', 'zrealizowane', 'anulowane']) {
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
  });
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

  it('answers 400 when an identity field runs past its limit', async () => {
    asAdmin();
    setTables({
      ...cardFound(),
      orders: { select: () => ({ data: null, error: null }) }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .post('/api/admin/order-cards/card-1/convert')
      .send({ price: 2500, passport_number: 'X'.repeat(33) });

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

  /**
   * The order and its identity document are one act, and PostgREST cannot wrap
   * them in a transaction. A failed second write therefore has to undo the
   * first, or the card would burn its one conversion on an order the office
   * cannot complete.
   */
  it('withdraws the order when the identity document cannot be stored', async () => {
    asAdmin();
    const deletes = [];
    setTables({
      ...cardFound(),
      orders: {
        select: () => ({ data: null, error: null }),
        insert: (ctx) => ({ data: { id: 'order-1', ...ctx.payload }, error: null }),
        delete: (ctx) => (deletes.push(ctx.filters), { data: null, error: null })
      },
      order_identity_documents: {
        insert: () => ({ data: null, error: { message: 'write failed' } })
      }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .post('/api/admin/order-cards/card-1/convert')
      .send({ price: 2500, passport_series: 'AB', passport_number: '1234567' });

    expect(response.status).toBe(500);
    expect(deletes).toHaveLength(1);
  });

  it('answers 201 with the initial status on a correct conversion', async () => {
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
  });
});

/* ------------------------------------------------------------------ */
/* 7.3.4  Card deletion vs. order cancellation                          */
/* ------------------------------------------------------------------ */

describe('DELETE /api/admin/order-cards/:id', () => {
  it('answers 409 and deletes nothing when the card already became an order', async () => {
    asAdmin();
    const deletes = [];
    setTables({
      orders: { select: () => ({ data: { id: 'order-1' }, error: null }) },
      order_cards: { delete: (ctx) => (deletes.push(ctx), { data: null, error: null }) }
    });

    const response = await api(app, { cookies: sessionCookies() }).delete(
      '/api/admin/order-cards/card-1'
    );

    expect(response.status).toBe(409);
    // The order card cascades into orders, so a delete that got through here
    // would silently destroy the production order. A finished order is
    // retired with the `anulowane` status instead, never removed.
    expect(deletes).toHaveLength(0);
  });

  it('deletes a card that was never converted', async () => {
    asAdmin();
    const deletes = [];
    setTables({
      orders: { select: () => ({ data: null, error: null }) },
      order_cards: { delete: (ctx) => (deletes.push(ctx), { data: null, error: null }) }
    });

    const response = await api(app, { cookies: sessionCookies() }).delete(
      '/api/admin/order-cards/card-1'
    );

    expect(response.status).toBe(200);
    expect(deletes).toHaveLength(1);
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

/* ------------------------------------------------------------------ */
/* What the office is entitled to see                                   */
/* ------------------------------------------------------------------ */

describe('GET /api/admin/orders', () => {
  /**
   * FM2: "Raport zapisywany jest wraz ze znacznikiem czasu zakończenia
   * i widoczny jest w panelu administracyjnym." Before this the office read
   * the installation card's id and status and nothing else, so the comments
   * and the site photograph — the entire content of the report — stopped at
   * the installer's screen and the telephone call stayed exactly where it was.
   */
  it('carries the crew report back to the office', async () => {
    asAdmin();
    setTables({
      orders: {
        select: () => ({
          data: [
            {
              id: 'order-1',
              status: 'zrealizowane',
              user_id: 'user-1',
              order_identity_documents: [],
              installation_cards: [
                {
                  id: 'inst-1',
                  status: 'zrealizowane',
                  completion_timestamp: '2026-09-01T12:00:00Z',
                  worker_comments: 'Zamontowano, podłoże wyrównane.',
                  photo_evidence_url: 'order-1/evidence.jpg'
                }
              ],
              order_cards: null
            }
          ],
          error: null
        })
      }
    });

    const response = await api(app, { cookies: sessionCookies() }).get('/api/admin/orders');

    const report = response.body.data[0].installation_report;
    expect(report.workerComments).toBe('Zamontowano, podłoże wyrównane.');
    expect(report.completionTimestamp).toBe('2026-09-01T12:00:00Z');
    // A path is not fetchable on its own: the bucket is private, so the panel
    // needs a link minted for this read.
    expect(report.photoUrl).toContain('order-1/evidence.jpg');
  });
});

describe('GET /api/admin/order-cards', () => {
  /**
   * FK17: "Fotografia jest powiązana z kartą i widoczna w panelu
   * administracyjnym." The upload path stored `order_details.photo_path` from
   * the start, but nothing read it back except the work sheet, so the office
   * could not see what the engraver was being sent.
   */
  it('signs the customer portrait for the office', async () => {
    asAdmin();
    setTables({
      order_cards: {
        select: () => ({
          data: [
            {
              id: 'card-1',
              user_id: 'user-1',
              order_details: [{ id: 'detail-1', photo_path: 'card-1/portrait.png' }]
            }
          ],
          error: null
        })
      },
      orders: { select: () => ({ data: [], error: null }) }
    });

    const response = await api(app, { cookies: sessionCookies() }).get('/api/admin/order-cards');

    const [detail] = response.body.data[0].order_details;
    expect(detail.photo_path).toBe('card-1/portrait.png');
    expect(detail.photo_url).toContain('card-1/portrait.png');
  });

  it('leaves the photo link null when no portrait was attached', async () => {
    asAdmin();
    setTables({
      order_cards: {
        select: () => ({
          data: [
            { id: 'card-2', user_id: 'user-2', order_details: [{ id: 'detail-2', photo_path: null }] }
          ],
          error: null
        })
      },
      orders: { select: () => ({ data: [], error: null }) }
    });

    const response = await api(app, { cookies: sessionCookies() }).get('/api/admin/order-cards');

    expect(response.body.data[0].order_details[0].photo_url).toBeNull();
  });
});
