const NBRB_PLN_URL = 'https://api.nbrb.by/exrates/rates/PLN?parammode=2';
const CACHE_TTL_MS = 60 * 60 * 1000;

/** Last known official relation: 10 PLN = 8.0182 BYN (NBRB, 2026-08-17). Used only if the API is down. */
const FALLBACK = {
  source: 'fallback',
  date: '2026-08-17',
  scale: 10,
  officialRate: 8.0182,
  bynPerPln: 0.80182,
  plnPerByn: 10 / 8.0182
};

let cache = {
  fetchedAt: 0,
  payload: null
};

const toPayload = (scale, officialRate, date, source) => ({
  source,
  date,
  scale,
  officialRate,
  bynPerPln: officialRate / scale,
  plnPerByn: scale / officialRate
});

export const getPlnExchangeRate = async () => {
  if (cache.payload && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.payload;
  }

  try {
    const response = await fetch(NBRB_PLN_URL, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      throw new Error(`NBRB responded ${response.status}`);
    }
    const body = await response.json();
    const scale = Number(body.Cur_Scale);
    const officialRate = Number(body.Cur_OfficialRate);
    if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(officialRate) || officialRate <= 0) {
      throw new Error('NBRB returned an invalid PLN rate');
    }
    const payload = toPayload(scale, officialRate, String(body.Date ?? '').slice(0, 10), 'nbrb');
    cache = { fetchedAt: Date.now(), payload };
    return payload;
  } catch (error) {
    if (cache.payload) return cache.payload;
    console.warn('NBRB PLN rate unavailable, using fallback:', error.message);
    return FALLBACK;
  }
};
