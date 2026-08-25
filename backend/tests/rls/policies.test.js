import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  rlsEnabled,
  skipReason,
  admin,
  anonClient,
  seedAccounts,
  seedOrders,
  cleanup
} from './seed.js';

/**
 * 7.4  Database-level security.
 *
 * Every request here goes straight to PostgREST with a real user JWT, skipping
 * Express entirely. That is what an attacker holding the public project URL and
 * the anon key can do, so these cases show whether the system's safety rests on
 * server code alone or on rules the server cannot bypass.
 */

const suite = rlsEnabled ? describe : describe.skip;

if (!rlsEnabled) {
  // eslint-disable-next-line no-console
  console.warn(`\n  ${skipReason}\n`);
}

suite('Row Level Security', () => {
  let accounts;
  let created;

  beforeAll(async () => {
    accounts = await seedAccounts();
    created = await seedOrders(accounts);
  });

  afterAll(async () => {
    await cleanup(accounts, created);
  });

  /* ---------------------------------------------------------------- */
  /* Trigger: the role is decided by the database, not by the caller   */
  /* ---------------------------------------------------------------- */

  describe('sign-up trigger', () => {
    it('gives the client role to an account that asked for admin in its metadata', async () => {
      // clientA signed up with user_metadata.role = 'admin' (see seed.js).
      const { data, error } = await admin
        .from('profiles')
        .select('role')
        .eq('id', accounts.clientA.id)
        .single();

      expect(error).toBeNull();
      // Without this the whole panel would be one sign-up payload away.
      expect(data.role).toBe('klient');
    });
  });

  /* ---------------------------------------------------------------- */
  /* Isolation between two clients                                     */
  /* ---------------------------------------------------------------- */

  describe('client isolation', () => {
    it('shows client A an empty set when reading client B\'s cards', async () => {
      const { data, error } = await accounts.clientA.db
        .from('order_cards')
        .select('id')
        .eq('user_id', accounts.clientB.id);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('shows client A only their own cards when reading the table unfiltered', async () => {
      const { data, error } = await accounts.clientA.db.from('order_cards').select('id, user_id');

      expect(error).toBeNull();
      expect(data.every((row) => row.user_id === accounts.clientA.id)).toBe(true);
      expect(data.map((r) => r.id)).not.toContain(accounts.clientB.orderCardId);
    });

    it('refuses a card that client A tries to file under client B', async () => {
      const { data, error } = await accounts.clientA.db
        .from('order_cards')
        .insert({ user_id: accounts.clientB.id })
        .select('id');

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it('refuses a client changing the status of a production order', async () => {
      const { data } = await accounts.clientA.db
        .from('orders')
        .update({ status: 'zrealizowane' })
        .eq('id', accounts.clientA.orderId)
        .select('id');

      // Either an outright error or zero affected rows — both mean "denied".
      expect(data ?? []).toEqual([]);

      const { data: check } = await admin
        .from('orders')
        .select('status')
        .eq('id', accounts.clientA.orderId)
        .single();
      expect(check.status).toBe('oczekujące');
    });

    it('refuses a client granting themselves the admin role', async () => {
      await accounts.clientA.db
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', accounts.clientA.id);

      const { data } = await admin
        .from('profiles')
        .select('role')
        .eq('id', accounts.clientA.id)
        .single();

      expect(data.role).toBe('klient');
    });

    it('refuses an anonymous visitor writing a contact message directly', async () => {
      const { error } = await anonClient()
        .from('contact_messages')
        .insert({ name: 'Bypass', email: 'bypass@example.test', message: 'direct write' })
        .select('id');

      // The form is public, but only through the backend endpoint — which
      // validates and rate-limits first. A direct write would skip both.
      expect(error).not.toBeNull();
    });

    it('shows a client an empty set of contact messages', async () => {
      const { data, error } = await accounts.clientA.db.from('contact_messages').select('id');

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('refuses a client writing an audit log entry', async () => {
      const { error } = await accounts.clientA.db
        .from('audit_logs')
        .insert({ action: 'forged.entry' })
        .select('id');

      expect(error).not.toBeNull();
    });
  });

  /* ---------------------------------------------------------------- */
  /* Installer                                                         */
  /* ---------------------------------------------------------------- */

  describe('installer', () => {
    it('sees the production orders of both clients', async () => {
      const { data, error } = await accounts.monter.db.from('orders').select('id');

      expect(error).toBeNull();
      const ids = data.map((row) => row.id);
      expect(ids).toContain(accounts.clientA.orderId);
      expect(ids).toContain(accounts.clientB.orderId);
    });

    it('is refused deletion of an order card', async () => {
      await accounts.monter.db.from('order_cards').delete().eq('id', accounts.clientA.orderCardId);

      const { data } = await admin
        .from('order_cards')
        .select('id')
        .eq('id', accounts.clientA.orderCardId)
        .maybeSingle();

      expect(data).not.toBeNull();
    });

    /**
     * Documented intent (AUTH.md): an installer may "read all, update status".
     * The policy currently grants UPDATE on every column, so this case is the
     * regression guard for the DB fix described in AUTH.md's "Known gap" note.
     * It is expected to fail until the column-scope trigger is deployed.
     */
    it.fails('is refused a change to an order column other than status', async () => {
      await accounts.monter.db
        .from('orders')
        .update({ client_full_name: 'Overwritten By Installer' })
        .eq('id', accounts.clientA.orderId);

      const { data } = await admin
        .from('orders')
        .select('client_full_name')
        .eq('id', accounts.clientA.orderId)
        .single();

      expect(data.client_full_name).not.toBe('Overwritten By Installer');
    });
  });

  /* ---------------------------------------------------------------- */
  /* Administrator                                                     */
  /* ---------------------------------------------------------------- */

  describe('administrator', () => {
    it('can read the audit log', async () => {
      const { error } = await accounts.admin.db.from('audit_logs').select('id').limit(1);

      expect(error).toBeNull();
    });
  });

  /* ---------------------------------------------------------------- */
  /* Public catalogue                                                  */
  /* ---------------------------------------------------------------- */

  describe('catalogue', () => {
    it('is readable without authentication', async () => {
      const { error } = await anonClient().from('materials').select('id, name').limit(1);

      expect(error).toBeNull();
    });

    it('is not writable without authentication', async () => {
      const { error } = await anonClient()
        .from('materials')
        .insert({ name: 'Forged Stone', category: 'Stone', price_per_m2: 1 })
        .select('id');

      expect(error).not.toBeNull();
    });

    it('is not writable by a signed-in client either', async () => {
      const { error } = await accounts.clientA.db
        .from('materials')
        .insert({ name: 'Forged Stone', category: 'Stone', price_per_m2: 1 })
        .select('id');

      expect(error).not.toBeNull();
    });
  });
});
