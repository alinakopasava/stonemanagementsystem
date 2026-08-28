import { afterAll, beforeAll, describe, it, expect, vi } from 'vitest';
import { parseCookies } from '../../src/http/cookies.js';
import { getClientIp, getUserAgent } from '../../src/http/client-ip.js';

/* ------------------------------------------------------------------ */
/* Cookie parsing                                                       */
/* ------------------------------------------------------------------ */

describe('parseCookies', () => {
  it('returns an empty object when there is no header', () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies('')).toEqual({});
    expect(parseCookies(null)).toEqual({});
  });

  it('reads several cookies from one header', () => {
    expect(parseCookies('a=1; b=2; c=3')).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('keeps "=" characters inside a value, as JWTs and base64 contain them', () => {
    expect(parseCookies('token=abc.def=='))
      .toEqual({ token: 'abc.def==' });
  });

  it('decodes percent-encoded values', () => {
    expect(parseCookies('name=Anna%20Kowalska')).toEqual({ name: 'Anna Kowalska' });
  });

  it('keeps a malformed encoding verbatim instead of throwing', () => {
    expect(parseCookies('broken=%E0%A4%A')).toEqual({ broken: '%E0%A4%A' });
  });

  it('skips fragments with no "=" and entries with an empty name', () => {
    expect(parseCookies('novalue; =orphan; ok=1')).toEqual({ ok: '1' });
  });

  it('is not fooled by a non-string header', () => {
    expect(parseCookies(42)).toEqual({});
    expect(parseCookies({})).toEqual({});
  });
});

/* ------------------------------------------------------------------ */
/* Client identification                                                */
/* ------------------------------------------------------------------ */

describe('getClientIp', () => {
  it('reports the address Express resolved', () => {
    expect(getClientIp({ headers: {}, ip: '10.0.0.1' })).toBe('10.0.0.1');
  });

  it('never reads X-Forwarded-For itself', () => {
    // Reading the header by hand means taking the left-most entry, which the
    // client writes. A rate limit keyed on that is bypassed by forging a new
    // address per attempt, so the value has to come from Express, which walks
    // the list from the right according to the `trust proxy` setting.
    const req = { headers: { 'x-forwarded-for': '203.0.113.5, 70.41.3.18' }, ip: '10.0.0.1' };
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('falls back to the socket address when Express resolved nothing', () => {
    expect(getClientIp({ headers: {}, socket: { remoteAddress: '10.0.0.2' } })).toBe('10.0.0.2');
  });

  it('returns null when the client cannot be identified at all', () => {
    expect(getClientIp({ headers: {} })).toBeNull();
  });
});

describe('getUserAgent', () => {
  it('returns the header as given', () => {
    expect(getUserAgent({ headers: { 'user-agent': 'Mozilla/5.0' } })).toBe('Mozilla/5.0');
  });

  it('truncates an over-long agent to 300 characters', () => {
    const value = getUserAgent({ headers: { 'user-agent': 'x'.repeat(5000) } });
    expect(value).toHaveLength(300);
  });

  it('returns null when the header is missing', () => {
    expect(getUserAgent({ headers: {} })).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* The other half of getClientIp: proxy trust switched off              */
/* ------------------------------------------------------------------ */

/**
 * The rest of the suite runs with `TRUST_PROXY=true`, which is what lets each
 * test present its own client IP. That leaves the branch that matters most for
 * security untested: with trust switched off, `X-Forwarded-For` is attacker-
 * controlled input and must be ignored outright, or a single header would let
 * one client hold as many rate-limit budgets as it cares to invent.
 */
describe('getClientIp with proxy trust switched off', () => {
  const previous = process.env.TRUST_PROXY;
  let getClientIpUntrusted;

  beforeAll(async () => {
    process.env.TRUST_PROXY = 'false';
    vi.resetModules();
    ({ getClientIp: getClientIpUntrusted } = await import('../../src/http/client-ip.js'));
  });

  afterAll(() => {
    process.env.TRUST_PROXY = previous;
    vi.resetModules();
  });

  it('ignores X-Forwarded-For and uses the socket address instead', () => {
    const req = { headers: { 'x-forwarded-for': '1.2.3.4' }, ip: '10.0.0.1' };

    // However the header is forged, the caller stays in one rate-limit bucket.
    expect(getClientIpUntrusted(req)).toBe('10.0.0.1');
    expect(getClientIpUntrusted({ headers: { 'x-forwarded-for': '9.9.9.9' }, ip: '10.0.0.1' })).toBe(
      '10.0.0.1'
    );
  });

  it('still reports nothing when there is no socket address either', () => {
    expect(getClientIpUntrusted({ headers: { 'x-forwarded-for': '1.2.3.4' } })).toBeNull();
  });
});
