import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Fixture accounts for the Row Level Security suite.
 *
 * The suite runs only when it is explicitly switched on, because it writes to a
 * real project: it creates confirmed accounts, promotes two of them and removes
 * everything again afterwards. Never point it at production.
 */
export const rlsEnabled =
  process.env.RLS_TEST_ENABLED === 'true' &&
  Boolean(process.env.SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_ANON_KEY) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const skipReason =
  'RLS suite skipped: set RLS_TEST_ENABLED=true and the SUPABASE_* keys in backend/.env to run it.';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const admin = rlsEnabled
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

/** A PostgREST client carrying one user's JWT — exactly what a browser could do. */
export const clientFor = (accessToken) =>
  createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });

/** An anonymous client: the public anon key and nothing else. */
export const anonClient = () =>
  createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

const stamp = Date.now();
const password = `Rls-Test-${stamp}!`;

const accountSpec = [
  { key: 'clientA', role: 'klient' },
  { key: 'clientB', role: 'klient' },
  { key: 'monter', role: 'monter' },
  { key: 'admin', role: 'admin' }
];

/**
 * Creates the fixture accounts.
 *
 * `signUp` is used for clientA rather than the admin API, and it deliberately
 * passes `role: 'admin'` in the user metadata: that is the escalation attempt
 * the trigger has to ignore.
 */
export const seedAccounts = async () => {
  const accounts = {};

  for (const { key, role } of accountSpec) {
    const email = `rls-${key.toLowerCase()}-${stamp}@example.test`;

    if (key === 'clientA') {
      const anon = anonClient();
      const { error } = await anon.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: 'Rls',
            last_name: key,
            // The escalation attempt: metadata is fully caller-controlled.
            role: 'admin'
          }
        }
      });
      if (error) throw new Error(`Failed to sign up ${key}: ${error.message}`);

      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const created = list.users.find((u) => u.email === email);
      if (!created) throw new Error(`Signed-up user ${email} not found`);
      await admin.auth.admin.updateUserById(created.id, { email_confirm: true });
      accounts[key] = { id: created.id, email, role };
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: 'Rls', last_name: key }
      });
      if (error) throw new Error(`Failed to create ${key}: ${error.message}`);
      accounts[key] = { id: data.user.id, email, role };
    }
  }

  // The trigger seeds every profile as `klient`; staff roles are granted here
  // through the service role, mirroring the documented manual promotion.
  for (const { key, role } of accountSpec) {
    if (role === 'klient') continue;
    const { error } = await admin
      .from('profiles')
      .update({ role })
      .eq('id', accounts[key].id);
    if (error) throw new Error(`Failed to promote ${key}: ${error.message}`);
  }

  // Sign each account in to obtain a real JWT.
  for (const key of Object.keys(accounts)) {
    const anon = anonClient();
    const { data, error } = await anon.auth.signInWithPassword({
      email: accounts[key].email,
      password
    });
    if (error) throw new Error(`Failed to sign in ${key}: ${error.message}`);
    accounts[key].accessToken = data.session.access_token;
    accounts[key].db = clientFor(data.session.access_token);
  }

  return accounts;
};

/** Seeds one order card + order per client so isolation has something to hide. */
export const seedOrders = async (accounts) => {
  const created = { cards: [], orders: [] };

  for (const key of ['clientA', 'clientB']) {
    const { data: card, error: cardError } = await admin
      .from('order_cards')
      .insert({ user_id: accounts[key].id })
      .select('id')
      .single();
    if (cardError) throw new Error(`Failed to seed card for ${key}: ${cardError.message}`);
    created.cards.push(card.id);
    accounts[key].orderCardId = card.id;

    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        user_id: accounts[key].id,
        order_card_id: card.id,
        status: 'oczekujące'
      })
      .select('id')
      .single();
    if (orderError) throw new Error(`Failed to seed order for ${key}: ${orderError.message}`);
    created.orders.push(order.id);
    accounts[key].orderId = order.id;
  }

  return created;
};

export const cleanup = async (accounts, created) => {
  if (!accounts) return;
  for (const id of created?.orders ?? []) {
    await admin.from('orders').delete().eq('id', id);
  }
  for (const id of created?.cards ?? []) {
    await admin.from('order_cards').delete().eq('id', id);
  }
  for (const account of Object.values(accounts)) {
    await admin.from('profiles').delete().eq('id', account.id);
    await admin.auth.admin.deleteUser(account.id);
  }
};
