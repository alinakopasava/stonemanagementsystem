-- =============================================================================
-- 0008_tighten_staff_writes.sql
-- Two holes RLS was leaving open under the application code.
--
-- 1. `monter` had an unrestricted UPDATE on `orders` and `order_cards`. No
--    endpoint ever used it: every mutation of those tables sits behind
--    `requireRole('admin')`, and the installer's own service only ever SELECTs
--    from `orders`. What the grant did allow was an installer calling PostgREST
--    directly with their own JWT and rewriting price, contract name, passport
--    fields and deadlines. The policies now match what the code actually does.
--
-- 2. `orders.order_card_id` had no UNIQUE constraint. That one card becomes one
--    order was enforced only by a read-then-write in the service, which two
--    concurrent conversions can interleave.
--
-- Safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Updates on orders and order cards are an office operation
-- -----------------------------------------------------------------------------
drop policy if exists "orders_update_staff" on public.orders;
drop policy if exists "order_cards_update_staff" on public.order_cards;
drop policy if exists "orders_update_admin" on public.orders;
drop policy if exists "order_cards_update_admin" on public.order_cards;

create policy "orders_update_admin"
  on public.orders for update
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "order_cards_update_admin"
  on public.order_cards for update
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- 2. One order card converts into at most one order
-- -----------------------------------------------------------------------------
-- Existing duplicates would make the constraint fail with a message that does
-- not say which rows are at fault, so name them first.
do $$
declare
  duplicates text;
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_order_card_id_key'
  ) then
    select string_agg(order_card_id::text, ', ')
      into duplicates
      from (
        select order_card_id
        from public.orders
        where order_card_id is not null
        group by order_card_id
        having count(*) > 1
      ) d;

    if duplicates is not null then
      raise exception
        'Cannot add the unique constraint: these order cards already have more than one order: %. Resolve them first, then re-run this migration.',
        duplicates;
    end if;

    alter table public.orders
      add constraint orders_order_card_id_key unique (order_card_id);
  end if;
end $$;
