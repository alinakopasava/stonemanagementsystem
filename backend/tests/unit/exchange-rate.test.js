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

/**
 * NBP quotes both pairs against the złoty: 1 BYN = 2.7 PLN in table B, and
 * 1 USD = 3.65 PLN in table A. The catalogue works in roubles, so the service
 * turns those into 1 PLN = 0.370 BYN and 1 USD = 1.352 BYN.
 */
const NBP_BYN = { rates: [{ mid: 2.7, effectiveDate: '2026-08-20' }] };
const NBP_USD = { rates: [{ mid: 3.65, effectiveDate: '2026-08-20' }] };

/** Answers whichever of the two tables the service is asking for. */
const nbpAnswer = (url) => jsonResponse(String(url).includes('/b/byn') ? NBP_BYN : NBP_USD);

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
    const { getPlnExchangeRate } = await loadService(async (url) => nbpAnswer(url));

    const rate = await getPlnExchangeRate();

    expect(rate.source).toBe('nbp');
    expect(rate.plnPerByn).toBeCloseTo(2.7, 9);
    expect(rate.bynPerPln).toBeCloseTo(1 / 2.7, 9);
    // The dollar is a cross rate through the zloty: 3.65 / 2.7 roubles.
    expect(rate.bynPerUsd).toBeCloseTo(3.65 / 2.7, 9);
    expect(rate.date).toBe('2026-08-20');
  });

  it('gives up on the request after eight seconds', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const { getPlnExchangeRate } = await loadService(async (url) => nbpAnswer(url));

    await getPlnExchangeRate();

    // A hanging bank service must not become a hanging catalogue page.
    expect(timeout).toHaveBeenCalledWith(8000);
    timeout.mockRestore();
  });

  it('answers a second caller from the cache instead of asking again', async () => {
    const { getPlnExchangeRate, fetchMock } = await loadService(async (url) => nbpAnswer(url));

    const first = await getPlnExchangeRate();
    const asked = fetchMock.mock.calls.length;
    const second = await getPlnExchangeRate();

    expect(fetchMock.mock.calls).toHaveLength(asked);
    expect(second).toEqual(first);
  });

  it('serves the last good answer when the service later fails', async () => {
    let failing = false;
    const { getPlnExchangeRate } = await loadService(async (url) => {
      if (failing) throw new Error('ECONNREFUSED');
      return nbpAnswer(url);
    });

    const fresh = await getPlnExchangeRate();

    // Push the clock past the one-hour cache window, then break the service.
    failing = true;
    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);
    const afterOutage = await getPlnExchangeRate();

    expect(afterOutage).toEqual(fresh);
    expect(afterOutage.source).toBe('nbp');
  });

  it('falls back to the rate recorded in the code when the cache is empty', async () => {
    const { getPlnExchangeRate, fetchMock } = await loadService(async () => {
      throw new Error('ENOTFOUND api.nbp.pl');
    });

    const rate = await getPlnExchangeRate();

    // Worst case the customer sees a slightly stale price, never an error.
    expect(rate.source).toBe('fallback');
    expect(rate.date).toBe('2026-08-17');
    expect(rate.bynPerPln).toBeCloseTo(0.80182, 9);

    // Both tables were asked for before giving up on the pair.
    const asked = fetchMock.mock.calls.map(([url]) => String(url));
    expect(asked.some((url) => url.includes('/b/byn'))).toBe(true);
    expect(asked.some((url) => url.includes('/a/usd'))).toBe(true);

    // And the bank is not asked again on the next request: otherwise every
    // page load would pay the timeout over again.
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
    ['a missing rate', { rates: [{ effectiveDate: '2026-08-20' }] }],
    ['a rate that is not a number', { rates: [{ mid: 'two point seven' }] }],
    ['a rate of zero', { rates: [{ mid: 0 }] }],
    ['a negative rate', { rates: [{ mid: -2.7 }] }],
    ['an empty table', { rates: [] }]
  ])('falls back rather than dividing by %s', async (_label, body) => {
    const { getPlnExchangeRate } = await loadService(async () => jsonResponse(body));

    const rate = await getPlnExchangeRate();

    expect(rate.source).toBe('fallback');
    expect(Number.isFinite(rate.plnPerByn)).toBe(true);
  });
});
