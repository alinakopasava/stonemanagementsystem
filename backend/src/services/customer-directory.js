import { supabaseAdmin } from '../config/supabase.js';

/**
 * Who a customer is, assembled from the two places that know it.
 *
 * A person is split across `profiles` (name, telephone, role) and
 * `auth.users` (the address they sign in with), and every list that shows a
 * customer needs both halves. The office panel and the installer worklist were
 * each carrying their own copy of the same two loaders; the copies had already
 * begun to differ in which columns they asked for, which is how the next one
 * would have started differing in behaviour.
 */

/** The columns the crew needs: how to reach the customer on site. */
export const CONTACT_COLUMNS = 'id, first_name, last_name, phone_number';

/** The office also administers accounts, so it sees the role and the join date. */
export const ACCOUNT_COLUMNS = 'id, first_name, last_name, phone_number, role, created_at';

/**
 * Profiles for a set of user ids, keyed by id.
 *
 * Read through the caller's own client, never the service role:
 * `profiles_select_self_admin_or_assigned` already answers "may this role see
 * this customer", and for an installer that means only customers whose order
 * has been handed over to the crew. Going around it with the service role
 * would hand back the whole address book.
 */
export const loadClientProfiles = async ({ supabase, userIds, columns = CONTACT_COLUMNS }) => {
  const wanted = [...new Set((userIds ?? []).filter(Boolean))];
  if (wanted.length === 0) return new Map();

  const { data, error } = await supabase.from('profiles').select(columns).in('id', wanted);

  if (error) {
    throw new Error('Failed to load client profiles.');
  }

  return new Map((data ?? []).map((p) => [p.id, p]));
};

/**
 * Email addresses by user id.
 *
 * These live in `auth.users`, which no RLS policy exposes, so this is one of
 * the documented service-role paths. Paged rather than fetched whole because
 * the admin API caps a page at 1000; the ceiling of fifty pages is there so a
 * malformed response cannot spin the request forever.
 */
export const loadAuthEmails = async () => {
  const emailById = new Map();
  const perPage = 1000;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error('Failed to list auth users.');
    }
    const users = data?.users ?? [];
    for (const user of users) {
      emailById.set(user.id, user.email ?? null);
    }
    if (users.length < perPage) break;
  }
  return emailById;
};
