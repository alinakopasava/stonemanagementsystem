-- =============================================================================
-- 0016_tighten_staff_reads.sql
-- Two more grants that were wider than the code behind them, in the same
-- spirit as 0008.
--
-- 1. `orders_insert_own_or_staff` let any authenticated user insert a row into
--    `orders` for themselves. No client-side path does: a production order is
--    created in exactly one place, `convertOrderCardToOrder`, behind
--    `requireRole('admin')`. What the grant allowed was a customer calling
--    PostgREST with their own JWT and writing an order with any price, any
--    deadline and any status — and, because `orders.order_card_id` is UNIQUE
--    since 0008, squatting the key of their own card so that the office's
--    legitimate conversion fails with "already converted". Creating an order
--    is an office operation, so the policy now says so.
--
-- 2. `profiles_select_self_or_staff` let `monter` read every profile in the
--    system — the name and telephone of every customer, not only those whose
--    orders they were sent to install. The installer's own service reads
--    profiles for the orders on its worklist, which is an inner join against
--    `installation_cards`; the policy now allows exactly that set and no more.
--
-- Safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Creating a production order is an office operation
-- -----------------------------------------------------------------------------
drop policy if exists "orders_insert_own_or_staff" on public.orders;
drop policy if exists "orders_insert_admin" on public.orders;

create policy "orders_insert_admin"
  on public.orders for insert
  to authenticated
  with check (public.current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- 2. An installer sees the customers they were sent to
-- -----------------------------------------------------------------------------
drop policy if exists "profiles_select_self_or_staff" on public.profiles;
drop policy if exists "profiles_select_self_admin_or_assigned" on public.profiles;

create policy "profiles_select_self_admin_or_assigned"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'monter'
      -- Handed over to the crew: an installation card exists for an order of
      -- this customer. Until the office hands the job over, the installer has
      -- no reason to know who the customer is.
      and exists (
        select 1
          from public.orders o
          join public.installation_cards ic on ic.order_id = o.id
         where o.user_id = profiles.id
      )
    )
  );
