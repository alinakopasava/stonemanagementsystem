import { apiFetch } from '@infrastructure/api/api-client';

export interface ExchangeRate {
  source: 'nbrb' | 'fallback';
  date: string;
  scale: number;
  officialRate: number;
  /** BYN for 1 PLN. */
  bynPerPln: number;
  /** PLN for 1 BYN. */
  plnPerByn: number;
}

export const fetchExchangeRate = async (): Promise<ExchangeRate> => {
  const payload = await apiFetch<{ data: ExchangeRate }>('/api/exchange-rate');
  return payload.data;
};
