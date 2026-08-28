import { describe, it, expect, afterEach, vi } from 'vitest';
import { ApiError, apiFetch, isRateLimited } from '@infrastructure/api/api-client';

/**
 * 7.2.5  The one function every other layer sends its requests through.
 *
 * `fetch` is replaced outright here rather than intercepted at the network
 * layer, because two of the three behaviours under examination are properties
 * of the call itself (credentials, serialisation), not of the response.
 */

const respondWith = (body: string, init: ResponseInit = {}) => {
  const fetchMock = vi.fn(async () => new Response(body, init));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('sends cookies with a cross-origin request', async () => {
    const fetchMock = respondWith(JSON.stringify({ data: 1 }));

    await apiFetch('/api/me');

    // The session lives in httpOnly cookies; without this the browser would
    // omit them and every authenticated call would answer 401.
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
  });

  it('asks for and announces JSON, and serialises the body', async () => {
    const fetchMock = respondWith(JSON.stringify({ ok: true }), { status: 201 });

    await apiFetch('/api/contact', { method: 'POST', body: { name: 'Anna' } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Accept: 'application/json'
    });
    expect(init.body).toBe('{"name":"Anna"}');
  });

  it('sends no body at all when none was given', async () => {
    const fetchMock = respondWith(JSON.stringify({ data: [] }));

    await apiFetch('/api/materials');

    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  it('returns the parsed payload on success', async () => {
    respondWith(JSON.stringify({ data: { id: 'card-1' } }), { status: 201 });

    await expect(apiFetch('/api/orders/submit', { method: 'POST', body: {} })).resolves.toEqual({
      data: { id: 'card-1' }
    });
  });

  it('turns a 4xx into an error that keeps the server message', async () => {
    respondWith(JSON.stringify({ message: 'Invalid credentials.' }), { status: 401 });

    // The interface shows this text, so losing it would leave the user with a
    // status code and no explanation.
    await expect(apiFetch('/api/auth/sign-in', { method: 'POST', body: {} })).rejects.toThrow(
      'Invalid credentials.'
    );
  });

  it('falls back to a message naming the status when the body is not JSON', async () => {
    respondWith('<html>502</html>', { status: 502 });

    await expect(apiFetch('/api/me')).rejects.toThrow('Request failed: 502');
  });

  it('marks a 429 so the interface can say "too many attempts" rather than "error"', async () => {
    respondWith(JSON.stringify({ message: 'Too many attempts. Try again later.' }), {
      status: 429
    });

    const error = await apiFetch('/api/auth/sign-in', { method: 'POST', body: {} }).catch(
      (e: unknown) => e
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(429);
    expect(isRateLimited(error)).toBe(true);
  });

  it('does not mark any other failure as rate limiting', async () => {
    respondWith(JSON.stringify({ message: 'Insufficient permissions.' }), { status: 403 });

    const error = await apiFetch('/api/admin/users').catch((e: unknown) => e);

    expect(isRateLimited(error)).toBe(false);
    expect(isRateLimited(new Error('network down'))).toBe(false);
  });

  it('treats an empty successful response as no payload', async () => {
    respondWith('', { status: 200 });

    await expect(apiFetch('/api/auth/sign-out', { method: 'POST' })).resolves.toBeNull();
  });
});
