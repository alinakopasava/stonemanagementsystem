import { PublicError } from './errors.js';

/**
 * Every id in this system is a Postgres `uuid`, and every endpoint that takes
 * one in the path has to say so before the value reaches a query. The pattern
 * lived in five services at once, which is four chances for one of them to
 * drift into accepting something the others reject.
 */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

/**
 * Rejects a malformed id with the caller's own wording.
 *
 * The message differs per endpoint on purpose — "Invalid order id" and
 * "Invalid order card id" are different facts for whoever reads the response —
 * so the message stays with the caller and only the rule lives here.
 */
export const assertUuid = (value, message) => {
  if (!isUuid(value)) {
    throw new PublicError(message);
  }
  return value;
};
