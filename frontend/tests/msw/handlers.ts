import { http, HttpResponse } from 'msw';

/**
 * Default happy-path API. Individual tests override what they care about with
 * `server.use(...)`, which keeps each test's setup limited to the one endpoint
 * under examination.
 */

export const MATERIALS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Gabbro-Diabase',
    category: 'Stone',
    price_per_m2: 420,
    image_url: '/images/materials/gabbro-diabase.jpg'
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Marble',
    category: 'Stone',
    price_per_m2: 900,
    image_url: '/images/materials/marble.jpg'
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Gandhi Granite',
    category: 'Stone',
    price_per_m2: 610,
    image_url: '/images/materials/gandhi.jpg'
  }
];

export const EXCHANGE_RATE = {
  source: 'nbp',
  date: '2026-08-20',
  scale: 10,
  officialRate: 8.0182,
  bynPerPln: 0.80182,
  plnPerByn: 10 / 8.0182,
  bynPerUsd: 3.0399,
  usdPerByn: 1 / 3.0399
};

export const handlers = [
  http.get('/api/materials', () => HttpResponse.json({ data: MATERIALS })),
  http.get('/api/products', () => HttpResponse.json({ data: [] })),
  http.get('/api/exchange-rate', () => HttpResponse.json({ data: EXCHANGE_RATE })),

  // No session by default: `useAuth` resolves to a guest.
  http.get('/api/me', () => HttpResponse.json({ message: 'Not authenticated.' }, { status: 401 })),

  http.post('/api/auth/sign-in', () => HttpResponse.json({ ok: true })),
  http.post('/api/auth/sign-up', () =>
    HttpResponse.json({ ok: true, requiresEmailConfirmation: true }, { status: 201 })
  ),
  http.post('/api/auth/sign-out', () => HttpResponse.json({ ok: true })),
  http.post('/api/auth/forgot-password', () => HttpResponse.json({ ok: true })),

  http.post('/api/contact', () =>
    HttpResponse.json({ data: { id: 'msg-1', receivedAt: '2026-08-25T10:00:00Z' } }, { status: 201 })
  ),

  http.post('/api/orders/submit', () =>
    HttpResponse.json({ data: { orderCard: { id: 'card-1' } } }, { status: 201 })
  ),

  // Nothing ordered by default; the my-orders suite overrides this per case.
  http.get('/api/orders/mine', () => HttpResponse.json({ data: [] }))
];

/** Signs the caller in as the given role for tests that need a session. */
export const authenticatedAs = (role: 'klient' | 'monter' | 'admin', overrides = {}) =>
  http.get('/api/me', () =>
    HttpResponse.json({
      data: {
        id: `${role}-1`,
        email: `${role}@example.com`,
        role,
        profile: {
          id: `${role}-1`,
          firstName: 'Anna',
          lastName: 'Kowalska',
          phoneNumber: null,
          role
        },
        ...overrides
      }
    })
  );
