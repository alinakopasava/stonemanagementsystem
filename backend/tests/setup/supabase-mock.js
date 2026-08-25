import { vi } from 'vitest';

/**
 * Test double for `src/config/supabase.js`.
 *
 * The production code talks to PostgREST through supabase-js' fluent builder
 * (`from().select().eq().single()`), so the double reproduces that shape rather
 * than stubbing individual call sites. Each terminal call hands the recorded
 * chain to a per-table handler the test registers, which keeps assertions about
 * *what was asked of the database* possible without a live database.
 *
 * Used together with:
 *   vi.mock('../../src/config/supabase.js', () => import('../setup/supabase-mock.js'));
 */

const notConfigured = (ctx) => ({
  data: null,
  error: { message: `No handler registered for ${ctx.client}:${ctx.table}.${ctx.op}` }
});

const state = {
  tables: {},
  onQuery: []
};

class QueryBuilder {
  constructor(table, client) {
    this.ctx = {
      table,
      client,
      op: 'select',
      payload: null,
      columns: null,
      filters: [],
      single: false,
      maybeSingle: false
    };
    this.opLocked = false;
  }

  select(columns) {
    this.ctx.columns = columns ?? null;
    return this;
  }

  insert(payload) {
    this.ctx.op = 'insert';
    this.ctx.payload = payload;
    this.opLocked = true;
    return this;
  }

  update(payload) {
    this.ctx.op = 'update';
    this.ctx.payload = payload;
    this.opLocked = true;
    return this;
  }

  delete() {
    this.ctx.op = 'delete';
    this.opLocked = true;
    return this;
  }

  eq(column, value) {
    this.ctx.filters.push({ type: 'eq', column, value });
    return this;
  }

  in(column, values) {
    this.ctx.filters.push({ type: 'in', column, values });
    return this;
  }

  order() {
    return this;
  }

  limit() {
    return this;
  }

  single() {
    this.ctx.single = true;
    return this.#run();
  }

  maybeSingle() {
    this.ctx.maybeSingle = true;
    return this.#run();
  }

  /** Makes the builder awaitable for chains with no `.single()` terminal. */
  then(onFulfilled, onRejected) {
    return this.#run().then(onFulfilled, onRejected);
  }

  #run() {
    const ctx = this.ctx;
    for (const spy of state.onQuery) spy(ctx);
    const handler = state.tables[ctx.table]?.[ctx.op];
    const result = handler ? handler(ctx) : notConfigured(ctx);
    return Promise.resolve(result);
  }
}

const makeFrom = (client) => vi.fn((table) => new QueryBuilder(table, client));

const defaultAuthResult = { data: { user: null, session: null }, error: null };

/** Service-role client: JWT verification, auth.users listing, audit + contact writes. */
export const supabaseAdmin = {
  from: makeFrom('admin'),
  auth: {
    getUser: vi.fn(async () => defaultAuthResult),
    admin: {
      signOut: vi.fn(async () => ({ error: null })),
      listUsers: vi.fn(async () => ({ data: { users: [] }, error: null }))
    }
  }
};

/** Anon client used for the password grant, sign-up and refresh flows. */
const authClient = {
  auth: {
    signInWithPassword: vi.fn(async () => defaultAuthResult),
    signUp: vi.fn(async () => defaultAuthResult),
    refreshSession: vi.fn(async () => defaultAuthResult),
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null }))
  },
  from: makeFrom('anon')
};

export const createSupabaseAuthClient = vi.fn(() => authClient);

/** Anonymous client for the public catalogue. */
export const supabasePublic = {
  from: makeFrom('public')
};

/** Per-request client bound to the caller's JWT (the RLS-enforcing one). */
const userClient = {
  from: makeFrom('user'),
  auth: {
    updateUser: vi.fn(async () => defaultAuthResult),
    getUser: vi.fn(async () => defaultAuthResult)
  }
};

export const supabaseForUser = vi.fn(() => userClient);

/* ------------------------------------------------------------------ */
/* Test controls                                                       */
/* ------------------------------------------------------------------ */

/** The anon auth client's spies — assert the auth module was (not) reached. */
export const authClientSpies = authClient.auth;
export const userClientSpies = userClient;

/**
 * Registers table handlers, e.g.
 *   setTables({ order_cards: { insert: () => ({ data: { id: 'x' }, error: null }) } })
 * Each handler receives the recorded chain: { table, client, op, payload, filters, columns }.
 */
export const setTables = (tables) => {
  state.tables = { ...state.tables, ...tables };
};

/** Observe every query the code under test issues. */
export const onQuery = (spy) => {
  state.onQuery.push(spy);
};

export const resetSupabaseMock = () => {
  state.tables = {};
  state.onQuery = [];

  supabaseAdmin.from.mockClear();
  supabaseAdmin.auth.getUser.mockReset().mockResolvedValue(defaultAuthResult);
  supabaseAdmin.auth.admin.signOut.mockReset().mockResolvedValue({ error: null });
  supabaseAdmin.auth.admin.listUsers
    .mockReset()
    .mockResolvedValue({ data: { users: [] }, error: null });

  authClient.from.mockClear();
  authClient.auth.signInWithPassword.mockReset().mockResolvedValue(defaultAuthResult);
  authClient.auth.signUp.mockReset().mockResolvedValue(defaultAuthResult);
  authClient.auth.refreshSession.mockReset().mockResolvedValue(defaultAuthResult);
  authClient.auth.resetPasswordForEmail.mockReset().mockResolvedValue({ data: {}, error: null });

  supabasePublic.from.mockClear();

  userClient.from.mockClear();
  userClient.auth.updateUser.mockReset().mockResolvedValue(defaultAuthResult);
  userClient.auth.getUser.mockReset().mockResolvedValue(defaultAuthResult);

  createSupabaseAuthClient.mockClear();
  supabaseForUser.mockClear();
};
