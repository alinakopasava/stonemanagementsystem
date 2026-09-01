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

    /**
     * Closed by `0016_tighten_staff_reads.sql`. A production order is created
     * in one place, behind `requireRole('admin')`. The INSERT the policy used
     * to grant was reachable only by a customer calling PostgREST with their
     * own JWT — writing their own price and deadline, and taking the UNIQUE
     * `order_card_id` of their card so the office's conversion would fail.
     */
    it('cannot create a production order for itself', async () => {
      const { error } = await accounts.clientA.db
        .from('orders')
        .insert({
          user_id: accounts.clientA.id,
          status: 'zrealizowane',
          price: 0
        })
        .select('id');

      expect(error).not.toBeNull();
    });

    /**
     * A client reads their own order row, so had the passport fields stayed on
     * `orders` they would have been readable here too. The office is the only
     * party the contract data is opened to — the customer supplies it in person
     * and is never shown it back through the application.
     */
    it('cannot read the identity document on its own order', async () => {
      const { data } = await accounts.clientA.db
        .from('order_identity_documents')
        .select('passport_number')
        .eq('order_id', accounts.clientA.orderId)
        .maybeSingle();

      expect(data).toBeNull();
    });
  });

  /* ---------------------------------------------------------------- */
  /* Installer                                                         */
  /* ---------------------------------------------------------------- */

  describe('installer', () => {
    /**
     * Narrowed by `0018_installer_reads_handed_over_only.sql`. The worklist is
     * an inner join against `installation_cards`, so an order still being
     * negotiated in the office never reaches the screen — but until 0018 the
     * policy granted `monter` the whole table, and a signed-in installer could
     * read price, contract terms and installation address for every order by
     * asking PostgREST directly. Nothing seeds an installation card, so at this
     * point nothing has been handed over.
     */
    it('sees no production order before one is handed over', async () => {
      const { data, error } = await accounts.monter.db.from('orders').select('id');

      expect(error).toBeNull();
      const ids = data.map((row) => row.id);
      expect(ids).not.toContain(accounts.clientA.orderId);
      expect(ids).not.toContain(accounts.clientB.orderId);
    });

    /** The other half of the same rule: handing the job over opens exactly it. */
    it('sees the order the office hands over, and only that one', async () => {
      const { data: card, error: handOverError } = await admin
        .from('installation_cards')
        .insert({ order_id: accounts.clientA.orderId, status: 'oczekujące' })
        .select('id')
        .single();
      expect(handOverError).toBeNull();

      try {
        const { data } = await accounts.monter.db.from('orders').select('id');
        const ids = data.map((row) => row.id);
        expect(ids).toContain(accounts.clientA.orderId);
        expect(ids).not.toContain(accounts.clientB.orderId);
      } finally {
        await admin.from('installation_cards').delete().eq('id', card.id);
      }
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
     * Closed by `0008_tighten_staff_writes.sql`. Every endpoint that changes an
     * order sits behind `requireRole('admin')`, and the installer's own service
     * only reads from `orders` — so the UPDATE the policy used to grant was
     * reachable in exactly one way: an installer calling PostgREST directly
     * with their own JWT, to rewrite price, contract name or passport fields.
     */
    it('is refused any change to an order', async () => {
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

    /**
     * Narrowed by `0016_tighten_staff_reads.sql`. The worklist reads the
     * profile behind each order it shows, and it shows only orders handed over
     * to the crew. Nothing seeds an installation card here, so no customer has
     * been handed over and the installer is entitled to no profile but its own.
     */
    it('reads no customer profile before a job is handed over', async () => {
      const { data } = await accounts.monter.db
        .from('profiles')
        .select('id')
        .eq('id', accounts.clientA.id)
        .maybeSingle();

      expect(data).toBeNull();
    });

    /**
     * The counterpart to the write test above, and the reason `0014` exists.
     * RLS is row-level, so while the passport fields lived on `orders` the
     * installer's SELECT on that table reached them; that they never appeared
     * on screen was down to a select list in the service omitting two columns.
     * Now they live in a table no policy opens to `monter`, and the database
     * refuses the read however the query is written.
     */
    it('cannot read the identity document behind an order', async () => {
      const { data } = await accounts.monter.db
        .from('order_identity_documents')
        .select('passport_series, passport_number')
        .eq('order_id', accounts.clientA.orderId)
        .maybeSingle();

      expect(data).toBeNull();
    });

    it('is refused a change to an order card as well', async () => {
      const { data: before } = await admin
        .from('order_cards')
        .select('user_id')
        .eq('id', accounts.clientA.orderCardId)
        .single();

      await accounts.monter.db
        .from('order_cards')
        .update({ user_id: accounts.monter.id })
        .eq('id', accounts.clientA.orderCardId);

      const { data: after } = await admin
        .from('order_cards')
        .select('user_id')
        .eq('id', accounts.clientA.orderCardId)
        .single();

      expect(after.user_id).toBe(before.user_id);
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

  /* ---------------------------------------------------------------- */
  /* Referential integrity                                             */
  /* ---------------------------------------------------------------- */

  describe('deleting an order card', () => {
    /**
     * FA4 ran into a foreign key for as long as `order_details` did not cascade:
     * every card has a configuration row, so `delete from order_cards` was
     * refused and the office could not remove a card it had decided against.
     * Migration 0001 declared the cascade but skipped it, because the constraint
     * already existed; 0017 puts it back. The mocked API tests cannot see this —
     * only a real database can.
     */
    it('takes the configuration with it', async () => {
      const { data: card, error: cardError } = await admin
        .from('order_cards')
        .insert({ user_id: accounts.clientA.id })
        .select('id')
        .single();
      expect(cardError).toBeNull();

      const { error: detailsError } = await admin
        .from('order_details')
        .insert({ order_card_id: card.id, dimensions: '100x60x10' });
      expect(detailsError).toBeNull();

      const { error: deleteError } = await admin
        .from('order_cards')
        .delete()
        .eq('id', card.id);
      expect(deleteError).toBeNull();

      const { data: orphans } = await admin
        .from('order_details')
        .select('id')
        .eq('order_card_id', card.id);

      expect(orphans).toEqual([]);
    });
  });
});
