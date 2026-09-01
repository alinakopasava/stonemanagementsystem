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

const CARD_CONVERTED = 'card-converted';
const CARD_PENDING = 'card-pending';

const cardRow = (id, createdAt) => ({
  id,
  created_at: createdAt,
  order_details: [
    {
      id: `details-${id}`,
      dimensions: '100x60',
      inscription_text: 'Śp. Anna Kowalska',
      finish_type: 'Polished',
      materials: {
        id: 'mat-1',
        name: 'Gabbro-Diabase',
        category: 'Stone',
        price_per_m2: 420
      }
    }
  ]
});

/** Two submissions: the older one is already an order, the newer one is not. */
const twoCards = () => {
  setTables({
    order_cards: {
      select: () => ({
        data: [
          cardRow(CARD_PENDING, '2026-08-20T10:00:00Z'),
          cardRow(CARD_CONVERTED, '2026-08-10T10:00:00Z')
        ],
        error: null
      })
    },
    orders: {
      select: () => ({
        data: [
          {
            id: 'order-1',
            status: 'w_realizacji',
            price: 2500,
            deadline: '2026-12-01',
            installation_address: 'ul. Kwiatowa 1, Mińsk',
            created_at: '2026-08-11T09:00:00Z',
            updated_at: '2026-08-12T09:00:00Z',
            order_card_id: CARD_CONVERTED
          }
        ],
        error: null
      })
    }
  });
};

beforeEach(() => {
  resetSupabaseMock();
});

/* ------------------------------------------------------------------ */
/* Customer's own order list                                            */
/* ------------------------------------------------------------------ */

describe('GET /api/orders/mine', () => {
  it('refuses a request without a session with 401', async () => {
    const response = await api(app).get('/api/orders/mine');

    expect(response.status).toBe(401);
  });

  it('answers with an empty list without going looking for orders', async () => {
    signedInAs({ id: 'user-1' });
    setTables({ order_cards: { select: () => ({ data: [], error: null }) } });
    const queries = [];
    onQuery((ctx) => queries.push(ctx));

    const response = await api(app, { cookies: sessionCookies() }).get('/api/orders/mine');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    // And no second round trip: with no cards there is nothing to match orders to.
    expect(queries.filter((q) => q.table === 'orders')).toHaveLength(0);
  });

  it('returns every submission with its configuration, newest first', async () => {
    signedInAs({ id: 'user-1' });
    twoCards();

    const response = await api(app, { cookies: sessionCookies() }).get('/api/orders/mine');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.map((e) => e.id)).toEqual([CARD_PENDING, CARD_CONVERTED]);
    expect(response.body.data[0].order_details[0].dimensions).toBe('100x60');
    expect(response.body.data[0].order_details[0].materials.name).toBe('Gabbro-Diabase');
  });

  it('attaches the order to the card it grew out of, and nothing to the others', async () => {
    signedInAs({ id: 'user-1' });
    twoCards();

    const response = await api(app, { cookies: sessionCookies() }).get('/api/orders/mine');

    const byId = new Map(response.body.data.map((e) => [e.id, e]));
    // A submission the office has not converted yet is still the customer's
    // order — it is reported with no order attached rather than dropped.
    expect(byId.get(CARD_PENDING).order).toBeNull();
    expect(byId.get(CARD_CONVERTED).order.status).toBe('w_realizacji');
    expect(byId.get(CARD_CONVERTED).order.price).toBe(2500);
  });

  it('leaves the ownership filter to RLS instead of a user_id predicate', async () => {
    signedInAs({ id: 'user-1' });
    twoCards();
    const queries = [];
    onQuery((ctx) => queries.push(ctx));

    await api(app, { cookies: sessionCookies() }).get('/api/orders/mine');

    // The user-scoped client already sees only its own rows. A hand-written
    // predicate here would be a second, weaker copy of that rule.
    const cardQuery = queries.find((q) => q.table === 'order_cards');
    expect(cardQuery.client).toBe('user');
    expect(cardQuery.filters).toEqual([]);
  });

  it('answers 500 when the card query fails rather than reporting no orders', async () => {
    signedInAs({ id: 'user-1' });
    setTables({
      order_cards: { select: () => ({ data: null, error: { message: 'boom' } }) }
    });

    const response = await api(app, { cookies: sessionCookies() }).get('/api/orders/mine');

    // An empty list here would read as "you never ordered anything", which is
    // a worse lie than an error.
    expect(response.status).toBe(500);
  });
});
