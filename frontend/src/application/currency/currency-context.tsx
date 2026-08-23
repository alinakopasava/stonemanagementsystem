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
import { LANGUAGE_LOCALES } from '@application/i18n/translations';
import { fetchExchangeRate, type ExchangeRate } from '@infrastructure/api/exchange-rate-api';

export type DisplayCurrency = 'BYN' | 'PLN';

const STORAGE_KEY = 'signature-stone.exchange-rate';
const REFRESH_MS = 60 * 60 * 1000;

/** NBRB 2026-08-17: 10 PLN = 8.0182 BYN. Used until the live rate loads. */
const FALLBACK_RATE: ExchangeRate = {
  source: 'fallback',
  date: '2026-08-17',
  scale: 10,
  officialRate: 8.0182,
  bynPerPln: 0.80182,
  plnPerByn: 10 / 8.0182
};

const readCachedRate = (): ExchangeRate => {
  if (typeof window === 'undefined') return FALLBACK_RATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return FALLBACK_RATE;
    const parsed = JSON.parse(raw) as ExchangeRate;
    if (!parsed?.plnPerByn || !Number.isFinite(parsed.plnPerByn)) return FALLBACK_RATE;
    return parsed;
  } catch {
    return FALLBACK_RATE;
  }
};

interface CurrencyContextValue {
  /** ru → BYN (client), pl/en → PLN (diploma). */
  currency: DisplayCurrency;
  rate: ExchangeRate;
  fromByn: (amountByn: number) => number;
  formatFromByn: (amountByn: number, options?: { digits?: number }) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const { language } = useTranslation();
  const [rate, setRate] = useState<ExchangeRate>(readCachedRate);
  const currency: DisplayCurrency = language === 'ru' ? 'BYN' : 'PLN';

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
      return amountByn * rate.plnPerByn;
    },
    [currency, rate.plnPerByn]
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
    () => ({ currency, rate, fromByn, formatFromByn }),
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
