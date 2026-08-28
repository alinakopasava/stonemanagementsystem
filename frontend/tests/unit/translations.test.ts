import { describe, it, expect } from 'vitest';
import {
  LANGUAGE_LABELS,
  LANGUAGE_LOCALES,
  LANGUAGE_SHORT,
  SUPPORTED_LANGUAGES,
  dictionaries
} from '@application/i18n/translations';

/**
 * 7.2.4  Completeness of the translation dictionaries.
 *
 * A missing translation is invisible in development — the lookup falls back to
 * English and the page still renders. This walks the whole key set instead, so
 * the gap surfaces the moment a caption is added in one language only.
 */

const PLACEHOLDER = /\{(\w+)\}/g;
const placeholdersOf = (text: string) => new Set(text.match(PLACEHOLDER) ?? []);

const englishKeys = Object.keys(dictionaries.en);
const otherLanguages = SUPPORTED_LANGUAGES.filter((l) => l !== 'en');

describe('the language set', () => {
  it('is exactly the three languages the interface offers', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'pl', 'ru']);
  });

  it('gives each language a dictionary, a label, a short code and a locale', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(dictionaries[language], language).toBeDefined();
      expect(LANGUAGE_LABELS[language], language).toBeTruthy();
      expect(LANGUAGE_SHORT[language], language).toBeTruthy();
      // Feeds `toLocaleString`, which is how prices and dates are formatted.
      expect(LANGUAGE_LOCALES[language], language).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    }
  });
});

describe('dictionary completeness', () => {
  it('translates every English key, and adds none English does not have', () => {
    const known = new Set(englishKeys);

    for (const language of otherLanguages) {
      const missing = englishKeys.filter((key) => !(key in dictionaries[language]));
      // An orphan key is dead weight: nothing can ever look it up.
      const extra = Object.keys(dictionaries[language]).filter((key) => !known.has(key));

      expect({ language, missing, extra }).toEqual({ language, missing: [], extra: [] });
    }
  });

  it('leaves no caption blank in any language', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      const blank = Object.entries(dictionaries[language])
        .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
        .map(([key]) => key);

      expect({ language, blank }).toEqual({ language, blank: [] });
    }
  });
});

describe('interpolation placeholders', () => {
  it('keeps the same placeholders in every language as in English', () => {
    for (const language of otherLanguages) {
      const mismatched = englishKeys.filter((key) => {
        const source = placeholdersOf(dictionaries.en[key]);
        const target = placeholdersOf(dictionaries[language][key]);
        return source.size !== target.size || [...source].some((p) => !target.has(p));
      });

      // Dropping {price} in one language would print the caption without the sum.
      expect({ language, mismatched }).toEqual({ language, mismatched: [] });
    }
  });

  it('still uses the {price} placeholder the catalogue captions depend on', () => {
    expect(dictionaries.en['catalog.priceFrom']).toContain('{price}');
  });
});
