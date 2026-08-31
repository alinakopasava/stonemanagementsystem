/**
 * The Polish central bank, the one source of rates.
 *
 * Prices are held in BYN, so the obvious place to ask would be the Belarusian
 * central bank — and the service did ask it first, until it turned out that
 * `api.nbrb.by` is unreachable from the networks this application runs on.
 * Every price then paid a timeout before falling through to Warsaw, which is
 * a cost for no benefit.
 *
 * NBP publishes both pairs against the złoty: BYN in table B, republished
 * weekly, and USD in table A, daily. The dollar rate the catalogue needs is
 * therefore a cross rate — złoty per dollar divided by złoty per rouble.
 */
const NBP_BYN_URL = 'https://api.nbp.pl/api/exchangerates/rates/b/byn/?format=json';
const NBP_USD_URL = 'https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json';
const CACHE_TTL_MS = 60 * 60 * 1000;
/**
 * How long to leave the bank alone after a failed attempt.
 *
 * Without this, an unreachable service costs every single request the full
 * eight-second timeout and prints the same warning again — which is what a
 * blocked network looks like from the outside: a hung page and a wall of logs.
 */
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;

/**
 * Last known official relations, used only if the bank is unreachable:
 * 10 PLN = 8.0182 BYN and 1 USD = 3.0399 BYN, both read from the NBP tables
 * in August 2026. A slightly stale price beats a catalogue with no prices.
 */
const FALLBACK = {
  source: 'fallback',
  date: '2026-08-17',
  scale: 10,
  officialRate: 8.0182,
  bynPerPln: 0.80182,
  plnPerByn: 10 / 8.0182,
  bynPerUsd: 3.0399,
  usdPerByn: 1 / 3.0399
};

let cache = {
  fetchedAt: 0,
  payload: null
};

/** When the last attempt failed, and the attempt still in flight, if any. */
let lastFailureAt = 0;
let inFlight = null;

/**
 * Prices are held in BYN, so both pairs are expressed against the rouble:
 * `scale` złoty cost `officialRate` roubles, and one dollar costs `bynPerUsd`.
 */
const toPayload = ({ scale, officialRate, bynPerUsd, date, source }) => ({
  source,
  date,
  scale,
  officialRate,
  bynPerPln: officialRate / scale,
  plnPerByn: scale / officialRate,
  bynPerUsd,
  usdPerByn: 1 / bynPerUsd
});

const getJson = async (url, bank) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    throw new Error(`${bank} responded ${response.status}`);
  }
  return response.json();
};

const fetchFromNbp = async () => {
  const [byn, usd] = await Promise.all([
    getJson(NBP_BYN_URL, 'NBP'),
    getJson(NBP_USD_URL, 'NBP')
  ]);

  // Both pairs are quoted against the złoty, so the rouble figures the
  // catalogue works in are derived from them.
  const plnPerByn = Number(byn?.rates?.[0]?.mid);
  const plnPerUsd = Number(usd?.rates?.[0]?.mid);
  if (!Number.isFinite(plnPerByn) || plnPerByn <= 0 || !Number.isFinite(plnPerUsd) || plnPerUsd <= 0) {
    throw new Error('NBP returned an invalid rate');
  }

  return toPayload({
    scale: 1,
    officialRate: 1 / plnPerByn,
    bynPerUsd: plnPerUsd / plnPerByn,
    date: String(byn.rates[0].effectiveDate ?? '').slice(0, 10),
    source: 'nbp'
  });
};

const fetchRate = fetchFromNbp;

export const getPlnExchangeRate = async () => {
  const now = Date.now();

  if (cache.payload && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.payload;
  }

  // A recent attempt already failed: answer from what we have rather than
  // waiting out the timeout again on every request.
  if (lastFailureAt && now - lastFailureAt < RETRY_AFTER_FAILURE_MS) {
    return cache.payload ?? FALLBACK;
  }

  // Callers arriving while a request is open share it instead of opening their
  // own — a page that mounts twice must not cost two timeouts, and the warning
  // below belongs to the attempt, so it is printed once however many waited.
  inFlight ??= fetchRate().catch((error) => {
    lastFailureAt = Date.now();
    // Every failure is reported, not only the first one. The retry gate above
    // already stops us attempting more than once per RETRY_AFTER_FAILURE_MS,
    // so this cannot flood the log — and a silent fall back to a rate frozen
    // in the source is how a customer ends up quoted last year's conversion.
    console.warn(
      `Exchange rate unavailable, serving ${cache.payload ? 'the cached rate' : 'the built-in fallback'} ` +
        `(next attempt in ${RETRY_AFTER_FAILURE_MS / 60000} min):`,
      error.message
    );
    throw error;
  });

  // Hold on to our own promise: the `finally` below runs in every caller that
  // shared this attempt, and a late one must not clear a newer attempt that
  // someone else has since started.
  const attempt = inFlight;

  try {
    const payload = await attempt;
    cache = { fetchedAt: Date.now(), payload };
    lastFailureAt = 0;
    return payload;
  } catch {
    return cache.payload ?? FALLBACK;
  } finally {
    if (inFlight === attempt) inFlight = null;
  }
};
