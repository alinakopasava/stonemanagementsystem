import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/config/supabase.js', () => import('../setup/supabase-mock.js'));

const { app } = await import('../../src/app.js');
const { storageSpies } = await import('../setup/supabase-mock.js');
const { api, sessionCookies, signedInAs, resetSupabaseMock, setTables } = await import(
  '../setup/harness.js'
);

const CARD_ID = '3f0d9a1e-4c2b-4f8a-9e7d-1b2c3d4e5f60';

/** A one-pixel PNG: real magic bytes, so the type check has something to agree with. */
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c49444154789c63f8cfc0000003010100c9fe92ef0000000049454e44ae426082',
  'hex'
);

const cardAndDetail = (overrides = {}) => {
  setTables({
    order_cards: { select: () => ({ data: { id: CARD_ID }, error: null }) },
    order_details: {
      select: () => ({ data: { id: 'details-1', photo_path: null }, error: null }),
      update: () => ({ data: null, error: null })
    },
    ...overrides
  });
};

beforeEach(() => {
  resetSupabaseMock();
});

/* ------------------------------------------------------------------ */
/* 7.3.3  The portrait a customer attaches in the configurator          */
/* ------------------------------------------------------------------ */

describe('POST /api/orders/:cardId/photo', () => {
  it('rejects a request without a session with 401', async () => {
    const response = await api(app)
      .post(`/api/orders/${CARD_ID}/photo`)
      .set('Content-Type', 'image/png')
      .send(PNG);

    expect(response.status).toBe(401);
    expect(storageSpies.upload).not.toHaveBeenCalled();
  });

  it('stores the photo and writes its path onto the configuration', async () => {
    signedInAs({ id: 'user-1' });
    const updates = [];
    cardAndDetail({
      order_details: {
        select: () => ({ data: { id: 'details-1', photo_path: null }, error: null }),
        update: (ctx) => (updates.push(ctx), { data: null, error: null })
      }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .post(`/api/orders/${CARD_ID}/photo`)
      .set('Content-Type', 'image/png')
      .send(PNG);

    expect(response.status).toBe(201);
    // The object lands under the card it belongs to, so a path alone says which
    // job the face is for.
    const [path] = storageSpies.upload.mock.calls[0];
    expect(path.startsWith(`${CARD_ID}/`)).toBe(true);
    expect(path.endsWith('.png')).toBe(true);
    expect(updates[0].payload.photo_path).toBe(path);
    // Written with the service role: RLS reserves updates on order_details for
    // staff, and a customer's own client would match no rows without saying so.
    expect(updates[0].client).toBe('admin');
    // Read back through a signed link, never a bare path: the bucket is private.
    expect(response.body.data.photoUrl).toContain('token=signed');
  });

  it('refuses a file whose bytes disagree with its declared type', async () => {
    signedInAs({ id: 'user-1' });
    cardAndDetail();

    const response = await api(app, { cookies: sessionCookies() })
      .post(`/api/orders/${CARD_ID}/photo`)
      .set('Content-Type', 'image/png')
      .send(Buffer.from('#!/bin/sh\necho hello\n'));

    expect(response.status).toBe(400);
    // A script wearing an image label must not reach the bucket at all.
    expect(storageSpies.upload).not.toHaveBeenCalled();
  });

  it('refuses a card that is not the caller’s, before touching the bucket', async () => {
    signedInAs({ id: 'user-1' });
    // RLS answers an empty row for somebody else's card; the service treats
    // that as "not found" rather than leaking that the card exists.
    setTables({ order_cards: { select: () => ({ data: null, error: null }) } });

    const response = await api(app, { cookies: sessionCookies() })
      .post(`/api/orders/${CARD_ID}/photo`)
      .set('Content-Type', 'image/png')
      .send(PNG);

    expect(response.status).toBe(400);
    expect(storageSpies.upload).not.toHaveBeenCalled();
  });

  it('removes the previous portrait when one is replaced', async () => {
    signedInAs({ id: 'user-1' });
    cardAndDetail({
      order_details: {
        select: () => ({ data: { id: 'details-1', photo_path: `${CARD_ID}/old.png` }, error: null }),
        update: () => ({ data: null, error: null })
      }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .post(`/api/orders/${CARD_ID}/photo`)
      .set('Content-Type', 'image/png')
      .send(PNG);

    expect(response.status).toBe(201);
    // Otherwise every re-upload pays rent in the bucket forever.
    expect(storageSpies.remove).toHaveBeenCalledWith([`${CARD_ID}/old.png`]);
  });

  it('takes the uploaded file back out when the row cannot be updated', async () => {
    signedInAs({ id: 'user-1' });
    cardAndDetail({
      order_details: {
        select: () => ({ data: { id: 'details-1', photo_path: null }, error: null }),
        update: () => ({ data: null, error: { message: 'write failed' } })
      }
    });

    const response = await api(app, { cookies: sessionCookies() })
      .post(`/api/orders/${CARD_ID}/photo`)
      .set('Content-Type', 'image/png')
      .send(PNG);

    expect(response.status).toBe(500);
    // Nothing points at the file any more, so leaving it would be an orphan.
    const [uploadedPath] = storageSpies.upload.mock.calls[0];
    expect(storageSpies.remove).toHaveBeenCalledWith([uploadedPath]);
  });
});
