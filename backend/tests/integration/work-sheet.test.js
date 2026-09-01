import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/config/supabase.js', () => import('../setup/supabase-mock.js'));

const { app } = await import('../../src/app.js');
const { supabaseAdmin, storageSpies } = await import('../setup/supabase-mock.js');
const { api, sessionCookies, makeProfile, resetSupabaseMock, setTables } = await import(
  '../setup/harness.js'
);

const ADMIN_ID = 'admin-1';
const ORDER_ID = '3f0d9a1e-4c2b-4f8a-9e7d-1b2c3d4e5f60';

const DETAIL = {
  id: 'details-1',
  dimensions: '100x60x8',
  inscription_text: 'Śp. Anna Kowalska\n1948 – 2026',
  finish_type: 'Polished',
  shape: 'stele',
  inscription_style: 'roman',
  slab_variant: 'full',
  slab_thickness_cm: 5,
  base_height_cm: 15,
  base_width_cm: 120,
  base_depth_cm: 20,
  decoration: 'portrait',
  has_cross: true,
  has_flowerbed: false,
  photo_path: null,
  materials: { name: 'Gabbro-Diabase' }
};

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

const orderReturns = (order) =>
  setTables({ orders: { select: () => ({ data: order, error: null }) } });

const withDetails = (details = [DETAIL]) => ({
  id: ORDER_ID,
  order_cards: { order_details: details }
});

beforeEach(() => {
  resetSupabaseMock();
});

/* ------------------------------------------------------------------ */
/* 7.3.4  The workshop's copy of a job                                  */
/* ------------------------------------------------------------------ */

describe('GET /api/admin/orders/:id/work-sheet.pdf', () => {
  it('answers with a PDF attachment named after the order', async () => {
    asAdmin();
    orderReturns(withDetails());

    const response = await api(app, { cookies: sessionCookies() })
      .get(`/api/admin/orders/${ORDER_ID}/work-sheet.pdf`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    // An attachment, not an inline view: the office forwards the file by
    // e-mail, because the workshop has no account to log into.
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain('karta-pracy-3f0d9a1e.pdf');
    expect(response.body.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('answers 404 for an order the caller cannot see', async () => {
    asAdmin();
    // RLS returns nothing rather than refusing, so "no row" is the whole answer.
    orderReturns(null);

    const response = await api(app, { cookies: sessionCookies() }).get(
      `/api/admin/orders/${ORDER_ID}/work-sheet.pdf`
    );

    expect(response.status).toBe(404);
  });

  it('rejects an id that is not a uuid', async () => {
    asAdmin();

    const response = await api(app, { cookies: sessionCookies() }).get(
      '/api/admin/orders/not-a-uuid/work-sheet.pdf'
    );

    expect(response.status).toBe(400);
  });

  it('builds a sheet for an order with no configuration rather than failing', async () => {
    asAdmin();
    orderReturns({ id: ORDER_ID, order_cards: null });

    const response = await api(app, { cookies: sessionCookies() })
      .get(`/api/admin/orders/${ORDER_ID}/work-sheet.pdf`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    // The office still gets a sheet saying there is nothing to cut, which is
    // more useful than an error it cannot act on.
    expect(response.status).toBe(200);
    expect(response.body.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('does not go to the bucket when no portrait was attached', async () => {
    asAdmin();
    orderReturns(withDetails());

    await api(app, { cookies: sessionCookies() }).get(
      `/api/admin/orders/${ORDER_ID}/work-sheet.pdf`
    );

    expect(storageSpies.download).not.toHaveBeenCalled();
  });

  it('embeds the portrait when one is stored', async () => {
    asAdmin();
    orderReturns(withDetails([{ ...DETAIL, photo_path: 'card-1/portrait.png' }]));

    const response = await api(app, { cookies: sessionCookies() })
      .get(`/api/admin/orders/${ORDER_ID}/work-sheet.pdf`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(storageSpies.download).toHaveBeenCalledWith('card-1/portrait.png');
  });
});
