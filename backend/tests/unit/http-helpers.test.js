import { describe, it, expect } from 'vitest';
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
  // TRUST_PROXY is true across the suite (see tests/setup/test-env.js).
  it('takes the first hop of X-Forwarded-For behind a trusted proxy', () => {
    const req = { headers: { 'x-forwarded-for': '203.0.113.5, 70.41.3.18' }, ip: '10.0.0.1' };
    expect(getClientIp(req)).toBe('203.0.113.5');
  });

  it('falls back to the socket address when the header is absent', () => {
    expect(getClientIp({ headers: {}, ip: '10.0.0.1' })).toBe('10.0.0.1');
    expect(getClientIp({ headers: {}, socket: { remoteAddress: '10.0.0.2' } })).toBe('10.0.0.2');
  });

  it('ignores a blank header rather than returning an empty identity', () => {
    const req = { headers: { 'x-forwarded-for': '   ' }, ip: '10.0.0.1' };
    expect(getClientIp(req)).toBe('10.0.0.1');
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
