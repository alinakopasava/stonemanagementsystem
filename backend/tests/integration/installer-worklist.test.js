import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/config/supabase.js', () => import('../setup/supabase-mock.js'));

const { app } = await import('../../src/app.js');
const { onQuery } = await import('../setup/supabase-mock.js');
const {
  api,
  sessionCookies,
  signedInAs,
  makeProfile,
  resetSupabaseMock,
  setTables
} = await import('../setup/harness.js');

/**
 * The crew's worklist shows the jobs the office has handed over, and nothing
 * else. Before the hand-over the office is still agreeing price, address and
 * deadline; a job on the list that nobody has committed to is worse than no
 * job at all.
 *
 * The filtering is done by the database — an inner join on `installation_cards`
 * — so these cases assert on the query as well as on the answer. A version that
 * fetched everything and dropped rows in JavaScript would pass the second test
 * and fail the third.
 */

const ORDER_WITH_CARD = {
  id: 'order-handed-over',
  status: 'w_realizacji',
  price: 2500,
  installation_address: 'ul. Kwiatowa 1, Mińsk',
  contract_details: null,
  deadline: '2026-12-01',
  client_full_name: 'Anna Kowalska',
  created_at: '2026-08-10T10:00:00Z',
  updated_at: '2026-08-12T10:00:00Z',
  user_id: 'user-1',
  order_card_id: 'card-1',
  installation_cards: [
    {
      id: 'inst-1',
      status: 'oczekujące',
      photo_evidence_url: null,
      worker_comments: null,
      completion_timestamp: null
    }
  ],
  order_cards: { id: 'card-1', created_at: '2026-08-01T09:00:00Z', order_details: [] }
};

/**
 * `requireAuth` reads the caller's own profile with `maybeSingle`, while the
 * worklist looks up the clients behind the orders with `in`. One handler has to
 * answer both shapes or the request never reaches the code under test.
 */
const asInstaller = () => {
  signedInAs({ id: 'monter-1', role: 'monter' });
  setTables({
    profiles: {
      select: (ctx) =>
        ctx.maybeSingle
          ? { data: makeProfile({ id: 'monter-1', role: 'monter' }), error: null }
          : { data: [], error: null }
    }
  });
};

beforeEach(() => {
  resetSupabaseMock();
  asInstaller();
});

describe('GET /api/installation-cards', () => {
  it('asks the database for orders that have an installation card', async () => {
    setTables({ orders: { select: () => ({ data: [], error: null }) } });
    const queries = [];
    onQuery((ctx) => queries.push(ctx));

    await api(app, { cookies: sessionCookies() }).get('/api/installation-cards');

    // `!inner` is what turns the embed into a filter. Without it PostgREST
    // returns every order and merely leaves the embedded array empty.
    const orderQuery = queries.find((q) => q.table === 'orders');
    expect(orderQuery.columns).toContain('installation_cards!inner');
  });

  it('lists a job once the office has handed it over', async () => {
    setTables({ orders: { select: () => ({ data: [ORDER_WITH_CARD], error: null }) } });

    const response = await api(app, { cookies: sessionCookies() }).get('/api/installation-cards');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].orderId).toBe('order-handed-over');
  });

  /**
   * FM1 lists what the crew is entitled to: the installation address, the
   * deadline, the technical specification and the customer's contact details.
   * Price and contract terms belong to the agreement between the office and
   * the customer; the worklist must not carry them, and the check is on the
   * response rather than on the interface so hiding a field in the markup
   * cannot pass for removing it.
   */
  it('leaves the commercial terms out of the worklist', async () => {
    setTables({ orders: { select: () => ({ data: [ORDER_WITH_CARD], error: null }) } });

    const response = await api(app, { cookies: sessionCookies() }).get('/api/installation-cards');

    const job = response.body.data[0];
    expect(job).not.toHaveProperty('price');
    expect(job).not.toHaveProperty('contractDetails');
    expect(job.installationAddress).toBe('ul. Kwiatowa 1, Mińsk');
    expect(job.deadline).toBe('2026-12-01');
  });

  it('does not ask the database for the commercial terms either', async () => {
    setTables({ orders: { select: () => ({ data: [], error: null }) } });
    const queries = [];
    onQuery((ctx) => queries.push(ctx));

    await api(app, { cookies: sessionCookies() }).get('/api/installation-cards');

    const orderQuery = queries.find((q) => q.table === 'orders');
    // `price` on its own line is the order's own column. The catalogue rate
    // inside the embedded `materials ( ... price_per_m2 )` is a different
    // thing: it is public, readable without signing in at all.
    expect(orderQuery.columns).not.toMatch(/^\s*price\s*,/m);
    expect(orderQuery.columns).not.toContain('contract_details');
  });

  it('reports the handed-over job as not yet worked on', async () => {
    setTables({ orders: { select: () => ({ data: [ORDER_WITH_CARD], error: null }) } });

    const response = await api(app, { cookies: sessionCookies() }).get('/api/installation-cards');

    // The card exists because of the hand-over, not because the crew wrote
    // anything — so it carries no comments, no photo and no completion time.
    const { report } = response.body.data[0];
    expect(report).not.toBeNull();
    expect(report.workerComments).toBeNull();
    expect(report.photoPath).toBeNull();
    expect(report.completionTimestamp).toBeNull();
  });

  it('refuses a report against an order the office has not handed over', async () => {
    const writes = [];
    setTables({
      orders: { select: () => ({ data: { id: 'order-not-handed-over' }, error: null }) },
      installation_cards: {
        select: () => ({ data: null, error: null }),
        insert: (ctx) => (writes.push(ctx), { data: { id: 'x' }, error: null }),
        update: (ctx) => (writes.push(ctx), { data: { id: 'x' }, error: null })
      }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .put('/api/installation-cards/3f0d9a1e-4c2b-4f8a-9e7d-1b2c3d4e5f60/report')
      .send({ status: 'zrealizowane', workerComments: 'Zamontowane.' });

    // Without this the worklist filter would be a display rule: writing the
    // report creates the card, and the card is what puts the job on the list.
    expect(response.status).toBe(409);
    expect(writes).toHaveLength(0);
  });

  it('accepts a report once the card exists', async () => {
    setTables({
      orders: { select: () => ({ data: { id: 'order-handed-over' }, error: null }) },
      installation_cards: {
        select: () => ({ data: { id: 'inst-1', completion_timestamp: null }, error: null }),
        update: () => ({
          data: {
            id: 'inst-1',
            status: 'zrealizowane',
            photo_evidence_url: null,
            worker_comments: 'Zamontowane.',
            completion_timestamp: '2026-08-28T10:00:00Z'
          },
          error: null
        })
      }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .put('/api/installation-cards/3f0d9a1e-4c2b-4f8a-9e7d-1b2c3d4e5f60/report')
      .send({ status: 'zrealizowane', workerComments: 'Zamontowane.' });

    expect(response.status).toBe(200);
    expect(response.body.data.workerComments).toBe('Zamontowane.');
  });

  it('refuses a photograph against an order not handed over, before uploading it', async () => {
    setTables({
      orders: { select: () => ({ data: { id: 'order-not-handed-over' }, error: null }) },
      installation_cards: { select: () => ({ data: null, error: null }) }
    });

    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(64, 1)]);
    const response = await api(app, { cookies: sessionCookies() })
      .post('/api/installation-cards/3f0d9a1e-4c2b-4f8a-9e7d-1b2c3d4e5f60/photo')
      .set('Content-Type', 'image/jpeg')
      .send(jpeg);

    // Checked before the upload, so a refused request leaves no orphan object
    // sitting in the bucket.
    expect(response.status).toBe(409);
  });

  it('shows an empty worklist when nothing has been handed over', async () => {
    setTables({ orders: { select: () => ({ data: [], error: null }) } });

    const response = await api(app, { cookies: sessionCookies() }).get('/api/installation-cards');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });
});
