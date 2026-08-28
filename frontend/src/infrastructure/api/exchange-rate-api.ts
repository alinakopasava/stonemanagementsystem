import { apiFetch } from '@infrastructure/api/api-client';

export interface ExchangeRate {
  /** Official rate from Minsk, from Warsaw when Minsk is unreachable, or the one in the code. */
  source: 'nbrb' | 'nbp' | 'fallback';
  date: string;
  scale: number;
  officialRate: number;
  /** BYN for 1 PLN. */
  bynPerPln: number;
  /** PLN for 1 BYN. */
  plnPerByn: number;
  /** BYN for 1 USD. */
  bynPerUsd: number;
  /** USD for 1 BYN. */
  usdPerByn: number;
}

export const fetchExchangeRate = async (): Promise<ExchangeRate> => {
  const payload = await apiFetch<{ data: ExchangeRate }>('/api/exchange-rate');
  return payload.data;
};
