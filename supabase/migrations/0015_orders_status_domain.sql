-- =============================================================================
-- 0015_orders_status_domain.sql
-- The status of an order becomes a closed set in the database too.
--
-- `orders.status` is a bare `text` with no constraint, defaulting to `'nowe'` —
-- a value the application does not know. `ALLOWED_ORDER_STATUSES` in
-- `admin.service.js` recognises four: oczekujące, w_realizacji, zrealizowane,
-- anulowane. Every write goes through that set, so `'nowe'` could only arrive
-- on a row inserted without a status, and the interface would render it as raw
-- text because no translation key matches it.
--
-- `order_details` already constrains its vocabularies this way — shape,
-- decoration, niche_style, slab_variant and inscription_style all carry a
-- CHECK. The status of an order is the one enumeration that was left open.
--
-- An enum type would be the closer match to `user_role` and
-- `contact_message_status`, but adding a value to an enum cannot be rolled back
-- inside a transaction, and this list is likelier to grow than those two. A
-- CHECK is edited by replacing it.
--
-- Existing rows carrying `'nowe'` are moved to `'oczekujące'`, which is the
-- status the conversion writes and therefore what those rows meant.
--
-- Safe to re-run.
-- =============================================================================

update public.orders
   set status = 'oczekujące'
 where status is null
    or status not in ('oczekujące', 'w_realizacji', 'zrealizowane', 'anulowane');

alter table public.orders
  alter column status set default 'oczekujące';

alter table public.orders
  alter column status set not null;

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
    check (status in ('oczekujące', 'w_realizacji', 'zrealizowane', 'anulowane'));
