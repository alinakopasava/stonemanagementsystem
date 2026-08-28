import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * 7.2.4  The only outward network dependency in the system.
 *
 * The bank's service is the one thing whose failure could stop prices being
 * shown at all, so all three of its states are reproduced here: a good answer,
 * a failure with something still in the cache, and a failure with nothing.
 * The module keeps its cache in module scope, so every case starts from a
 * freshly imported copy.
 */

const NBRB_ANSWER = { Cur_Scale: 10, Cur_OfficialRate: 8.0182, Date: '2026-08-20T00:00:00' };

const jsonResponse = (body) => ({ ok: true, status: 200, json: async () => body });

/** Imports a clean copy of the service with `fetch` behaving as told. */
const loadService = async (fetchImpl) => {
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn(fetchImpl));
  const module = await import('../../src/services/exchange-rate.service.js');
  return { getPlnExchangeRate: module.getPlnExchangeRate, fetchMock: globalThis.fetch };
};

beforeEach(() => {
  vi.useRealTimers();
  // The fallback path logs a warning on purpose; the suite output stays readable.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getPlnExchangeRate', () => {
  it('derives both unit rates from the scale the bank publishes', async () => {
    const { getPlnExchangeRate } = await loadService(async () => jsonResponse(NBRB_ANSWER));

    const rate = await getPlnExchangeRate();

    // The bank quotes 10 PLN = 8.0182 BYN; one zloty is therefore 0.80182 BYN.
    expect(rate.source).toBe('nbrb');
    expect(rate.scale).toBe(10);
    expect(rate.officialRate).toBe(8.0182);
    expect(rate.bynPerPln).toBeCloseTo(0.80182, 9);
    expect(rate.plnPerByn).toBeCloseTo(10 / 8.0182, 9);
    expect(rate.date).toBe('2026-08-20');
  });

  it('gives up on the request after eight seconds', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const { getPlnExchangeRate } = await loadService(async () => jsonResponse(NBRB_ANSWER));

    await getPlnExchangeRate();

    // A hanging bank service must not become a hanging catalogue page.
    expect(timeout).toHaveBeenCalledWith(8000);
    timeout.mockRestore();
  });

  it('answers a second caller from the cache instead of asking again', async () => {
    const { getPlnExchangeRate, fetchMock } = await loadService(async () =>
      jsonResponse(NBRB_ANSWER)
    );

    const first = await getPlnExchangeRate();
    const asked = fetchMock.mock.calls.length;
    const second = await getPlnExchangeRate();

    expect(fetchMock.mock.calls).toHaveLength(asked);
    expect(second).toEqual(first);
  });

  it('serves the last good answer when the service later fails', async () => {
    let failing = false;
    const { getPlnExchangeRate } = await loadService(async () => {
      if (failing) throw new Error('ECONNREFUSED');
      return jsonResponse(NBRB_ANSWER);
    });

    const fresh = await getPlnExchangeRate();

    // Push the clock past the one-hour cache window, then break the service.
    failing = true;
    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);
    const afterOutage = await getPlnExchangeRate();

    expect(afterOutage).toEqual(fresh);
    expect(afterOutage.source).toBe('nbrb');
  });

  it('falls back to the rate recorded in the code when the cache is empty', async () => {
    const { getPlnExchangeRate, fetchMock } = await loadService(async () => {
      throw new Error('ENOTFOUND api.nbrb.by');
    });

    const rate = await getPlnExchangeRate();

    // Worst case the customer sees a slightly stale price, never an error.
    expect(rate.source).toBe('fallback');
    expect(rate.date).toBe('2026-08-17');
    expect(rate.bynPerPln).toBeCloseTo(0.80182, 9);

    // Both banks were tried before giving up on the pair.
    const asked = fetchMock.mock.calls.map(([url]) => String(url));
    expect(asked.some((url) => url.includes('nbrb.by'))).toBe(true);
    expect(asked.some((url) => url.includes('nbp.pl'))).toBe(true);

    // And neither is asked again on the next request: otherwise every page
    // load would pay both timeouts over again.
    expect(await getPlnExchangeRate()).toEqual(rate);
    expect(fetchMock.mock.calls).toHaveLength(asked.length);
  });

  it('falls back when the service answers with an error status', async () => {
    const { getPlnExchangeRate } = await loadService(async () => ({
      ok: false,
      status: 503,
      json: async () => ({})
    }));

    expect((await getPlnExchangeRate()).source).toBe('fallback');
  });

  it.each([
    ['a missing rate', { Cur_Scale: 10 }],
    ['a rate that is not a number', { Cur_Scale: 10, Cur_OfficialRate: 'eight' }],
    ['a scale of zero', { Cur_Scale: 0, Cur_OfficialRate: 8.0182 }],
    ['a negative rate', { Cur_Scale: 10, Cur_OfficialRate: -8.0182 }]
  ])('falls back rather than dividing by %s', async (_label, body) => {
    const { getPlnExchangeRate } = await loadService(async () => jsonResponse(body));

    const rate = await getPlnExchangeRate();

    expect(rate.source).toBe('fallback');
    expect(Number.isFinite(rate.plnPerByn)).toBe(true);
  });
});
