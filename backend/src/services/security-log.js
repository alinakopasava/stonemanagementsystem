/**
 * Security events, written to stdout as one JSON object per line.
 *
 * This replaces the `audit_logs` table, which was dropped because nothing ever
 * read it. The events are still worth emitting: a run of failed sign-ins is how
 * a password attack looks from the inside, and a role change is the one event
 * that has to be attributable after the fact. Sending them to stdout puts them
 * wherever the host already collects logs, at no cost to the request — the DB
 * write was the part that made the old table expensive to keep honest.
 *
 * One line per event, so `grep`, `jq` and every log shipper can read it without
 * a parser. Never pass a password, token or full email here; an actor id and an
 * address are enough to follow a thread.
 */
export const logSecurityEvent = (action, details = {}) => {
  const entry = {
    at: new Date().toISOString(),
    kind: 'security',
    action,
    ...details
  };

  try {
    console.log(JSON.stringify(entry));
  } catch {
    // A value that will not serialize must not take the request down with it.
    console.log(JSON.stringify({ at: entry.at, kind: 'security', action }));
  }
};
