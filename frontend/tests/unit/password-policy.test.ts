import { describe, it, expect } from 'vitest';
import {
  PASSWORD_MAX_LENGTH,
  passwordMeetsPolicy,
  passwordRequirements
} from '@application/auth/password-policy';
import { dictionaries } from '@application/i18n/translations';

/**
 * 7.2.2  The password policy.
 *
 * The interesting cases are the two ends of the length range. An off-by-one at
 * the upper bound — `<` where `<=` belongs — rejects a password the interface
 * itself advertises as acceptable, and no test built from typical values would
 * ever notice.
 */

/** Exactly `length` characters, always carrying all three character classes. */
const passwordOfLength = (length: number) => `Aa1${'x'.repeat(Math.max(0, length - 3))}`;

describe('passwordMeetsPolicy', () => {
  it('accepts a password that satisfies every requirement', () => {
    expect(passwordMeetsPolicy('Passw0rd')).toBe(true);
  });

  it('rejects a password missing any one character class', () => {
    for (const password of ['passw0rd', 'PASSW0RD', 'Password', '12345678']) {
      expect(passwordMeetsPolicy(password), password).toBe(false);
    }
  });

  describe('length boundaries', () => {
    it('rejects seven characters and accepts eight', () => {
      expect(passwordOfLength(7)).toHaveLength(7);
      expect(passwordMeetsPolicy(passwordOfLength(7))).toBe(false);
      expect(passwordMeetsPolicy(passwordOfLength(8))).toBe(true);
    });

    it(`accepts exactly ${PASSWORD_MAX_LENGTH} characters`, () => {
      const atLimit = passwordOfLength(PASSWORD_MAX_LENGTH);

      expect(atLimit).toHaveLength(PASSWORD_MAX_LENGTH);
      // The guard against a strict `<` comparison at the upper bound.
      expect(passwordMeetsPolicy(atLimit)).toBe(true);
    });

    it(`rejects ${PASSWORD_MAX_LENGTH + 1} characters`, () => {
      expect(passwordMeetsPolicy(passwordOfLength(PASSWORD_MAX_LENGTH + 1))).toBe(false);
    });

    // Listed in 7.2.2 alongside the other two boundaries, so it stays.
    it('rejects an empty string', () => {
      expect(passwordMeetsPolicy('')).toBe(false);
    });
  });
});

describe('passwordRequirements', () => {
  it('lists the four rules the sign-up form shows', () => {
    expect(passwordRequirements.map((r) => r.id)).toEqual(['length', 'upper', 'lower', 'digit']);
  });

  it('turns each rule from failing to passing once the missing part is added', () => {
    const cases = [
      ['length', 'Aa1', 'Aa1xxxxx'],
      ['upper', 'passw0rd', 'Passw0rd'],
      ['lower', 'PASSW0RD', 'PASSW0Rd'],
      ['digit', 'Password', 'Password1']
    ];

    for (const [id, bad, good] of cases) {
      const rule = passwordRequirements.find((r) => r.id === id)!;

      expect(rule.test(bad), `${id} rejects "${bad}"`).toBe(false);
      expect(rule.test(good), `${id} accepts "${good}"`).toBe(true);
    }
  });

  it('has a caption in every language, so no rule renders as a bare key', () => {
    for (const rule of passwordRequirements) {
      for (const [language, dictionary] of Object.entries(dictionaries)) {
        expect(dictionary[rule.labelKey], `${rule.id} in ${language}`).toBeTruthy();
      }
    }
  });
});
