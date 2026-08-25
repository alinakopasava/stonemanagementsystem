# Testing

Five levels, each answering a question the level below it cannot.

| Level | Where | Count | Needs a database? | Command |
|---|---|---|---|---|
| Unit + API integration | `backend/tests/{unit,integration}` | 120 | no | `cd backend && npm test` |
| Row Level Security | `backend/tests/rls` | 16 | **yes** | `cd backend && npm run test:rls` |
| Unit + component | `frontend/tests/{unit,components}` | 60 | no | `cd frontend && npm test` |
| System (Playwright) | `frontend/tests/e2e` | 7 | **yes** | `cd frontend && npm run test:e2e` |

`npm test` at either level is hermetic: no network, no database, ~1 s per side.
The two database-backed levels are opt-in and skip with an explanatory message
until switched on.

## What each level is for

**API integration** drives the real Express middleware stack through supertest.
Supabase is replaced by a stub that reproduces the PostgREST query builder
(`from().select().eq().single()`), so tests can assert *what was asked of the
database* without one running. This is the level the thesis describes: it can
check that validation runs **before** any write, which a live database cannot
distinguish from a write that was rolled back.

**Row Level Security** does the opposite. It sends real user JWTs straight at
PostgREST, skipping Express entirely — reproducing an attacker who has the
public project URL and the anon key. It is the only level that can show whether
security survives the server being bypassed, which is precisely what mocks
cannot tell you.

**Component** tests run in jsdom with the WebGL viewer aliased to a stub, and
mock the network at the boundary with MSW rather than stubbing `fetch`. Queries
go through roles and labels, so restyling does not break them and an unusable
form does.

**System** tests are kept to seven paths on purpose: real cookie attributes,
data that survives a reload, and several roles meeting in one business process.
Everything checkable in isolation is checked lower down.

## Running the database-backed levels

> Point these at a **test** Supabase project. They create and delete real
> accounts and rows.

### Row Level Security

In `backend/.env`, alongside the existing `SUPABASE_*` values:

```bash
RLS_TEST_ENABLED=true
```

Then:

```bash
cd backend && npm run test:rls
```

The suite seeds two clients, an installer and an administrator, exercises the
policies, and deletes everything in `afterAll`.

One case is marked `it.fails` on purpose: it asserts that an installer cannot
change an order column other than `status`. The current policy grants UPDATE on
every column, so the case documents the open gap recorded under "Known gap" in
[AUTH.md](AUTH.md). Once the column-scope trigger is deployed, drop the
`.fails` and it becomes a regression guard.

### System tests

```bash
npx playwright install chromium
```

Self sign-up always produces a `klient`, so the installer and administrator
accounts have to be seeded once by hand (see "Promoting an admin / installer"
in [AUTH.md](AUTH.md)) and supplied through the environment:

```bash
E2E_ENABLED=true
E2E_CLIENT_EMAIL=...      # a confirmed client account
E2E_CLIENT_PASSWORD=...
E2E_MONTER_EMAIL=...
E2E_MONTER_PASSWORD=...
E2E_ADMIN_EMAIL=...
E2E_ADMIN_PASSWORD=...
```

```bash
cd frontend && npm run test:e2e
```

Playwright starts both the backend and the client app itself unless something
is already listening on their ports.

## Conventions

- **No fixed sleeps.** Web-first assertions (`expect(locator).toBeVisible()`)
  and `waitFor` retry on their own; a hard wait is the main source of flakiness.
- **Query by role and label**, not by class or test id. The exception is
  `data-testid="monument-viewer"` on the 3D stub, which exists only in tests.
- **`user-event`, not `fireEvent`** — it produces the same event sequence a real
  pointer and keyboard do.
- **One client IP per test** in the API suite. The rate limiters keep a counter
  per IP for the lifetime of the worker; without this, unrelated tests drain
  each other's budget and start failing with 429. Limiter tests pin an IP on
  purpose.
- **Unhandled requests fail.** MSW is configured with
  `onUnhandledRequest: 'error'`, so a test talking to something nobody stubbed
  is a failure rather than a silent real request.
