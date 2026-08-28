import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@application/i18n/i18n-context';
import { CurrencyProvider, useCurrency } from '@application/currency/currency-context';
import { server } from '../msw/server';
import { EXCHANGE_RATE } from '../msw/handlers';

/**
 * 7.2.4  Catalogue prices are held in BYN and shown in the currency that goes
 * with the chosen language: roubles for the Russian interface, z otych for the
 * Polish and English ones.
 */

const Probe = () => {
  const { currency, rate, fromByn, formatFromByn } = useCurrency();
  return (
    <>
      <span data-testid="currency">{currency}</span>
      <span data-testid="source">{rate.source}</span>
      <span data-testid="pln-per-byn">{rate.plnPerByn}</span>
      <span data-testid="byn-per-pln">{rate.bynPerPln}</span>
      <span data-testid="hundred">{fromByn(100)}</span>
      <span data-testid="not-a-number">{fromByn(Number.NaN)}</span>
      <span data-testid="formatted">{formatFromByn(100)}</span>
    </>
  );
};

/** Renders the provider stack with the interface language pinned beforehand. */
const renderInLanguage = async (language: 'en' | 'pl' | 'ru') => {
  window.localStorage.setItem('signature-stone.language', language);
  render(
    <I18nProvider>
      <CurrencyProvider>
        <Probe />
      </CurrencyProvider>
    </I18nProvider>
  );
  // The provider starts on the built-in rate and swaps in the fetched one.
  await waitFor(() => expect(screen.getByTestId('source').textContent).toBe('nbrb'));
};

const value = (id: string) => Number(screen.getByTestId(id).textContent);

describe('display currency', () => {
  it('shows roubles unconverted in the Russian interface', async () => {
    await renderInLanguage('ru');

    expect(screen.getByTestId('currency').textContent).toBe('BYN');
    expect(value('hundred')).toBe(100);
  });

  it('converts to z otych in the Polish interface', async () => {
    await renderInLanguage('pl');

    expect(screen.getByTestId('currency').textContent).toBe('PLN');
    expect(value('hundred')).toBeCloseTo(100 * EXCHANGE_RATE.plnPerByn, 6);
  });

  it('converts to dollars in the English interface', async () => {
    await renderInLanguage('en');

    expect(screen.getByTestId('currency').textContent).toBe('USD');
    expect(value('hundred')).toBeCloseTo(100 * EXCHANGE_RATE.usdPerByn, 6);
  });

  it('answers zero for a non-numeric amount rather than showing NaN', async () => {
    await renderInLanguage('pl');

    // "NaN z " in a price is worse than a wrong-looking zero the user can query.
    expect(value('not-a-number')).toBe(0);
    expect(screen.getByTestId('formatted').textContent).not.toMatch(/nan/i);
  });
});

describe('the rate itself', () => {
  // Deriving the unit rate from the bank's scale belongs to the backend service
  // and is pinned there; the provider only consumes what /api/exchange-rate
  // returns, so the cases below are about what it does when that fails.

  it('keeps the built-in rate when the service is unreachable', async () => {
    server.use(http.get('/api/exchange-rate', () => HttpResponse.error()));
    window.localStorage.setItem('signature-stone.language', 'pl');

    render(
      <I18nProvider>
        <CurrencyProvider>
          <Probe />
        </CurrencyProvider>
      </I18nProvider>
    );

    // The customer sees a slightly stale price, never an error in place of one.
    await waitFor(() => expect(screen.getByTestId('source').textContent).toBe('fallback'));
    expect(value('byn-per-pln')).toBeCloseTo(0.80182, 6);
    expect(value('hundred')).toBeGreaterThan(0);
  });

  it('reuses the rate cached from the previous visit before the network answers', async () => {
    window.localStorage.setItem('signature-stone.language', 'pl');
    window.localStorage.setItem(
      'signature-stone.exchange-rate',
      JSON.stringify({ ...EXCHANGE_RATE, source: 'nbrb', plnPerByn: 2, bynPerPln: 0.5 })
    );
    server.use(http.get('/api/exchange-rate', () => HttpResponse.error()));

    render(
      <I18nProvider>
        <CurrencyProvider>
          <Probe />
        </CurrencyProvider>
      </I18nProvider>
    );

    await waitFor(() => expect(value('hundred')).toBe(200));
  });

  it('ignores a corrupted cache entry', async () => {
    window.localStorage.setItem('signature-stone.language', 'pl');
    window.localStorage.setItem('signature-stone.exchange-rate', 'not json at all');
    server.use(http.get('/api/exchange-rate', () => HttpResponse.error()));

    render(
      <I18nProvider>
        <CurrencyProvider>
          <Probe />
        </CurrencyProvider>
      </I18nProvider>
    );

    await waitFor(() => expect(screen.getByTestId('source').textContent).toBe('fallback'));
  });
});
