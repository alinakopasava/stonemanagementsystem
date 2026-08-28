import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider, useTranslation } from '@application/i18n/i18n-context';

/**
 * 7.2.4  Choosing a language and filling a caption in.
 *
 * The detection helpers are private to the module, so they are exercised the
 * way the application uses them: through the provider, with the browser's
 * language list replaced.
 */

const Probe = () => {
  const { language, t } = useTranslation();
  return (
    <>
      <span data-testid="language">{language}</span>
      <span data-testid="price">{t('catalog.priceFrom', { price: '1 234' })}</span>
      <span data-testid="unfilled">{t('catalog.priceFrom')}</span>
    </>
  );
};

const renderWithBrowserLanguages = (languages: string[]) => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(languages[0] ?? 'en');
  return render(
    <I18nProvider>
      <Probe />
    </I18nProvider>
  );
};

const chosenLanguage = () => screen.getByTestId('language').textContent;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('language detection', () => {
  it.each([
    ['pl-PL', 'pl'],
    ['ru_RU', 'ru'],
    ['PL', 'pl']
  ])('reduces the browser tag %s to the base language %s', (tag, expected) => {
    renderWithBrowserLanguages([tag]);

    expect(chosenLanguage()).toBe(expected);
  });

  it('falls back to English for a language the interface does not have', () => {
    renderWithBrowserLanguages(['de-DE']);

    expect(chosenLanguage()).toBe('en');
  });

  it('takes the first supported entry from the browser list, not merely the first entry', () => {
    renderWithBrowserLanguages(['de-DE', 'cs', 'pl-PL']);

    expect(chosenLanguage()).toBe('pl');
  });

  it('prefers a previously stored choice over the browser setting', () => {
    window.localStorage.setItem('signature-stone.language', 'ru');

    renderWithBrowserLanguages(['pl-PL']);

    // A returning visitor keeps the language they picked.
    expect(chosenLanguage()).toBe('ru');
  });

  it('ignores a stored value outside the supported set', () => {
    window.localStorage.setItem('signature-stone.language', 'de');

    renderWithBrowserLanguages(['pl-PL']);

    expect(chosenLanguage()).toBe('pl');
  });

  it('publishes the choice on the document, so the page is marked in the right language', () => {
    renderWithBrowserLanguages(['pl-PL']);

    expect(document.documentElement.lang).toBe('pl');
  });
});

describe('caption interpolation', () => {
  it('substitutes the amount in place of the placeholder', () => {
    renderWithBrowserLanguages(['pl-PL']);

    const caption = screen.getByTestId('price').textContent ?? '';
    expect(caption).toContain('1 234');
    // A raw marker reaching the interface would read as a broken price.
    expect(caption).not.toContain('{price}');
  });

  it('leaves the placeholder visible when nothing was supplied for it', () => {
    renderWithBrowserLanguages(['pl-PL']);

    // Deliberate: a caption missing its value must look wrong to a developer
    // rather than silently render as an empty gap.
    expect(screen.getByTestId('unfilled').textContent).toContain('{price}');
  });
});
