import { describe, it, expect } from 'vitest';
import { checkPassword, passwordIsStrong } from '../../src/services/password-policy.js';

/**
 * The blocklist exists because length and character classes let through exactly
 * what an attacker tries first. These cases pin that gap shut: everything in
 * the "rejected" group satisfies every shape rule.
 */

describe('checkPassword — shape', () => {
  it.each([
    ['Ab1cdef', 'shorter than eight characters'],
    ['zielony8kamien', 'no capital letter'],
    ['ZIELONY8KAMIEN', 'no lowercase letter'],
    ['ZielonyKamien', 'no digit'],
    [`A1${'b'.repeat(200)}`, 'longer than 128 characters']
  ])('rejects %j — %s', (password) => {
    expect(checkPassword(password).reason).toBe('shape');
  });

  it.each([[null], [undefined], [42], [{}]])('rejects the non-string %j', (value) => {
    expect(checkPassword(value)).toEqual({ ok: false, reason: 'shape' });
  });
});

describe('checkPassword — breached passwords', () => {
  it.each([
    'Password123',
    'Qwerty123',
    'Welcome2026',
    'Letmein99',
    'Admin1234',
    'Iloveyou7'
  ])('rejects %s, which passes every shape rule', (password) => {
    // Guard the premise: if one of these ever stopped satisfying the shape
    // rules, the case would pass for the wrong reason.
    expect(password.length).toBeGreaterThanOrEqual(8);
    expect(/[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)).toBe(true);

    expect(checkPassword(password)).toEqual({ ok: false, reason: 'common' });
  });

  it.each([
    ['P4ssw0rd1', 'digits standing in for letters'],
    ['p@ssword12A', 'punctuation standing in for letters'],
    ['Password2026!', 'a year and a bang appended'],
    ['PASSWORD123', 'no — this one fails the shape rule first']
  ])('sees through %j (%s)', (password) => {
    expect(checkPassword(password).ok).toBe(false);
  });

  it('rejects a password made only of digits and symbols', () => {
    expect(checkPassword('12345678!').ok).toBe(false);
  });

  it.each([
    ['Administracja1', 'opens with "admin", but is not it'],
    ['Masterpiece77', 'opens with "master", but is not it'],
    ['Passionfruit9', 'opens with "pass", which is too short to count anyway']
  ])('accepts %s — %s', (password) => {
    // Refusing these would tell the user their password is "commonly used",
    // which is not true, and leave them guessing what is actually wrong.
    expect(checkPassword(password)).toEqual({ ok: true });
  });

  it.each(['Zielony8Kamien', 'Nadmorski42Klif', 'Kwiatowa7Aleja'])(
    'accepts %s',
    (password) => {
      expect(checkPassword(password)).toEqual({ ok: true });
      expect(passwordIsStrong(password)).toBe(true);
    }
  );
});
