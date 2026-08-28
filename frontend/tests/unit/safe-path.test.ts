import { describe, it, expect } from 'vitest';
import { safeInternalPath } from '@application/auth/safe-path';

/**
 * 7.2.3  Open-redirect guard.
 *
 * The value comes from the address bar: `/sign-in?from=...`. Anything that is
 * not unmistakably a path inside this application has to collapse to the root,
 * because the user follows this link straight after typing their password.
 */

/** Written as character codes so the literals stay out of the source file. */
const NUL = String.fromCharCode(0);
const DEL = String.fromCharCode(127);

describe('safeInternalPath', () => {
  it.each([
    ['a plain internal path', '/design'],
    ['a path with a query string', '/design?shape=stele'],
    ['a nested path', '/admin/users']
  ])('keeps %s unchanged', (_label, value) => {
    expect(safeInternalPath(value)).toBe(value);
  });

  it.each([
    ['an absolute http address', 'https://evil.example.com/steal'],
    ['a protocol-relative address', '//evil.example.com'],
    ['a backslash, which naive validation lets through', '/\\evil.example.com'],
    ['a scheme hidden mid-string', '/redirect?to=https://evil.example.com'],
    ['a javascript scheme', 'javascript:alert(1)'],
    ['a path with no leading slash', 'design'],
    ['an embedded NUL character', `/design${NUL}.evil`],
    ['an embedded newline', '/design\nSet-Cookie: x=1'],
    ['an embedded DEL character', `/design${DEL}`]
  ])('replaces %s with the root path', (_label, value) => {
    expect(safeInternalPath(value)).toBe('/');
  });

  it('replaces a value that is not a string at all with the root path', () => {
    for (const value of [null, undefined, 42, {}, ['/design']]) {
      expect(safeInternalPath(value)).toBe('/');
    }
  });

  it('refuses to send the user back to any of the authentication pages', () => {
    // Returning to the login form right after a successful login would loop.
    const authPaths = [
      '/sign-in',
      '/sign-up',
      '/forgot-password',
      '/confirm-email',
      '/auth/callback',
      '/auth/reset-password'
    ];

    for (const path of authPaths) {
      expect(safeInternalPath(path), path).toBe('/');
      expect(safeInternalPath(`${path}?from=/admin`), path).toBe('/');
    }
  });

  it('compares the path alone, so a query string cannot smuggle an auth route past the check', () => {
    expect(safeInternalPath('/design?next=/sign-in')).toBe('/design?next=/sign-in');
  });
});
