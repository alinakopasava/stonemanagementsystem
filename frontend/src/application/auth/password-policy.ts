import type { TranslationKey } from '@application/i18n/translations';

export const PASSWORD_MAX_LENGTH = 128;

export const passwordRequirements: ReadonlyArray<{
  id: string;
  labelKey: TranslationKey;
  test: (value: string) => boolean;
}> = [
  { id: 'length', labelKey: 'auth.req.length', test: (value) => value.length >= 8 },
  { id: 'upper', labelKey: 'auth.req.upper', test: (value) => /[A-Z]/.test(value) },
  { id: 'lower', labelKey: 'auth.req.lower', test: (value) => /[a-z]/.test(value) },
  { id: 'digit', labelKey: 'auth.req.digit', test: (value) => /\d/.test(value) }
];

export const passwordMeetsPolicy = (password: string): boolean =>
  password.length <= PASSWORD_MAX_LENGTH &&
  passwordRequirements.every((requirement) => requirement.test(password));
