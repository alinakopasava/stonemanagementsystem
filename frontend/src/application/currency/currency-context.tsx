import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { useTranslation } from '@application/i18n/i18n-context';
import { LANGUAGE_LOCALES, type Language } from '@application/i18n/translations';
import { fetchExchangeRate, type ExchangeRate } from '@infrastructure/api/exchange-rate-api';

export type DisplayCurrency = 'BYN' | 'PLN' | 'USD';

/** Roubles for the client in Minsk, złoty for the diploma, dollars abroad. */
const CURRENCY_BY_LANGUAGE: Record<Language, DisplayCurrency> = {
  ru: 'BYN',
  pl: 'PLN',
  en: 'USD'
};

const STORAGE_KEY = 'signature-stone.exchange-rate';
const REFRESH_MS = 60 * 60 * 1000;

/** 10 PLN = 8.0182 BYN and 1 USD = 3.0399 BYN. Used until the live rate loads. */
const FALLBACK_RATE: ExchangeRate = {
  source: 'fallback',
  date: '2026-08-17',
  scale: 10,
  officialRate: 8.0182,
  bynPerPln: 0.80182,
  plnPerByn: 10 / 8.0182,
  bynPerUsd: 3.0399,
  usdPerByn: 1 / 3.0399
};

const readCachedRate = (): ExchangeRate => {
  if (typeof window === 'undefined') return FALLBACK_RATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return FALLBACK_RATE;
    const parsed = JSON.parse(raw) as ExchangeRate;
    // Every pair has to be there: an entry cached before the dollar was added
    // would otherwise price the English catalogue at NaN.
    const usable = [parsed?.plnPerByn, parsed?.usdPerByn].every(
      (value) => typeof value === 'number' && Number.isFinite(value) && value > 0
    );
    return usable ? parsed : FALLBACK_RATE;
  } catch {
    return FALLBACK_RATE;
  }
};

/** Beyond this the published rate has moved on and ours has not. */
const RATE_STALE_AFTER_DAYS = 7;

/**
 * Whether the figure on screen still reflects a published rate.
 *
 * True in two cases: the built-in fallback is in use because neither bank
 * answered, or the last rate we did get is more than a week old. Prices are
 * held in roubles and converted for display, so a stale rate does not corrupt
 * anything stored — it quietly misquotes the customer, which is worse for
 * being invisible.
 */
const rateIsStale = (rate: ExchangeRate): boolean => {
  if (rate.source === 'fallback') return true;
  const published = Date.parse(rate.date ?? '');
  if (!Number.isFinite(published)) return true;
  return Date.now() - published > RATE_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
};

interface CurrencyContextValue {
  /** ru → BYN (client), pl → PLN (diploma), en → USD. */
  currency: DisplayCurrency;
  rate: ExchangeRate;
  /** The conversion is running on a fallback or a week-old rate. */
  isRateStale: boolean;
  fromByn: (amountByn: number) => number;
  formatFromByn: (amountByn: number, options?: { digits?: number }) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const { language } = useTranslation();
  const [rate, setRate] = useState<ExchangeRate>(readCachedRate);
  const currency: DisplayCurrency = CURRENCY_BY_LANGUAGE[language];

  const refresh = useCallback(async () => {
    try {
      const next = await fetchExchangeRate();
      setRate(next);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /** Keep the last good rate (cache or fallback). */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const fromByn = useCallback(
    (amountByn: number) => {
      if (!Number.isFinite(amountByn)) return 0;
      if (currency === 'BYN') return amountByn;
      const perByn = currency === 'USD' ? rate.usdPerByn : rate.plnPerByn;
      // A rate that never arrived must not turn the price into NaN.
      return Number.isFinite(perByn) ? amountByn * perByn : 0;
    },
    [currency, rate.plnPerByn, rate.usdPerByn]
  );

  const formatFromByn = useCallback(
    (amountByn: number, options?: { digits?: number }) => {
      const digits = options?.digits ?? 0;
      return fromByn(amountByn).toLocaleString(LANGUAGE_LOCALES[language], {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      });
    },
    [fromByn, language]
  );

  const value = useMemo(
    // Roubles are the currency prices are held in, so no conversion happens and
    // the rate cannot be wrong — the warning would be noise.
    () => ({
      currency,
      rate,
      isRateStale: currency !== 'BYN' && rateIsStale(rate),
      fromByn,
      formatFromByn
    }),
    [currency, rate, fromByn, formatFromByn]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = (): CurrencyContextValue => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used inside <CurrencyProvider>.');
  }
  return ctx;
};
