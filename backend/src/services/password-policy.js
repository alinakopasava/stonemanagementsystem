/**
 * Password rules.
 *
 * Length and character classes stop the trivially weak, but they wave through
 * exactly what an attacker tries first: `Password123` satisfies every one of
 * them. So the shape rules are followed by a list of the passwords that turn up
 * at the top of every credential dump, checked after normalising the tricks
 * people use to squeeze a real word past a policy.
 *
 * The list is kept local rather than queried from Have I Been Pwned. HIBP knows
 * far more passwords, but it puts a network call — and a decision about what to
 * do when it times out — in the middle of sign-up. A local list catches the
 * passwords that are actually guessed first, costs nothing, and behaves the
 * same on every run.
 */

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

/**
 * Roots that appear at the top of published breach corpora. Stored without the
 * digits and punctuation people append, because `normalise` strips those before
 * the comparison — `Password1!` and `p@ssword` both land on `password`.
 */
const COMMON_ROOTS = new Set([
  'password', 'passwort', 'haslo', 'parol', 'passw0rd', 'pass',
  'qwerty', 'qwertyuiop', 'qwertz', 'azerty', 'asdfgh', 'zxcvbn',
  'welcome', 'letmein', 'login', 'admin', 'administrator', 'root', 'guest',
  'monkey', 'dragon', 'sunshine', 'princess', 'football', 'baseball',
  'iloveyou', 'trustno', 'starwars', 'superman', 'batman', 'pokemon',
  'master', 'shadow', 'michael', 'jennifer', 'jordan', 'hunter', 'ranger',
  'freedom', 'whatever', 'computer', 'internet', 'samsung', 'google',
  'abcdef', 'abcabc', 'aaaaaa', 'test', 'testing', 'temp', 'changeme',
  'secret', 'summer', 'winter', 'spring', 'autumn', 'january', 'december',
  'zaqwsx', 'lekkerding', 'matrix', 'ninja', 'access', 'flower', 'hello',
  'kowalski', 'polska', 'warszawa', 'signaturestone', 'monument', 'granite'
]);

/** Leet substitutions, so `p4ssw0rd` is recognised as `password`. */
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };

/**
 * Reduces a password to the word someone was thinking of: lower-cased, leet
 * undone, and the digits and punctuation that get bolted on to pass a policy
 * removed from both ends.
 */
const normalise = (password) => {
  const lowered = password.toLowerCase();
  let out = '';
  for (let i = 0; i < lowered.length; i += 1) {
    // Only inside a word. The `0` of `passw0rd` stands for a letter; the `0`
    // of `password2026` is padding, and turning it into an `o` would hide the
    // padding from the length check below.
    const inWord = /[a-z]/.test(lowered[i - 1] ?? '') && /[a-z]/.test(lowered[i + 1] ?? '');
    out += inWord ? LEET[lowered[i]] ?? lowered[i] : lowered[i];
  }
  return out.replace(/^[^a-z]+/, '').replace(/[^a-z]+$/, '');
};

/**
 * How much may be bolted on to a known password before it counts as a different
 * one. Without a limit `administracja` would be rejected for opening with
 * `admin`, and `masterpiece` for opening with `master` — neither is a password
 * anyone guesses first, and refusing them tells the user something untrue.
 */
const MAX_PADDING = 3;

const isCommon = (password) => {
  const root = normalise(password);
  if (!root) return true; // digits and symbols only, e.g. 12345678

  // Two readings of the same password: as typed, and with the digits people
  // sprinkle through it removed, so `pass2026word` is weighed as `passsword`
  // rather than counted as twelve characters of originality.
  const forms = new Set([root, root.replace(/[^a-z]/g, '')]);

  for (const form of forms) {
    if (!form) continue;
    if (COMMON_ROOTS.has(form)) return true;
    for (const candidate of COMMON_ROOTS) {
      if (
        candidate.length >= 5 &&
        form.startsWith(candidate) &&
        form.length - candidate.length <= MAX_PADDING
      ) {
        return true;
      }
    }
  }
  return false;
};

const hasRequiredShape = (password) =>
  password.length >= MIN_LENGTH &&
  password.length <= MAX_LENGTH &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password);

/**
 * @returns {{ ok: true } | { ok: false, reason: 'shape' | 'common' }}
 * The caller decides what to tell the user; `reason` exists so a rejected
 * common password can say so instead of repeating the length rules, which the
 * password already satisfied.
 */
export const checkPassword = (password) => {
  if (typeof password !== 'string' || !hasRequiredShape(password)) {
    return { ok: false, reason: 'shape' };
  }
  if (isCommon(password)) {
    return { ok: false, reason: 'common' };
  }
  return { ok: true };
};

/** Kept for call sites that only need a yes or no. */
export const passwordIsStrong = (password) => checkPassword(password).ok;
