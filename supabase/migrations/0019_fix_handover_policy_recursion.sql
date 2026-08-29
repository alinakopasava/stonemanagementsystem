-- =============================================================================
-- 0019_fix_handover_policy_recursion.sql
-- Repairs 0018, which deadlocked the policies against each other.
--
-- 0018 made the `orders` SELECT policy ask whether an installation card exists
-- for the row. But the `installation_cards` policy asks, for a customer,
-- whether the order behind the card is theirs — and a table referenced inside a
-- policy expression is itself read under RLS. So `orders` consulted
-- `installation_cards`, which consulted `orders`, and PostgreSQL stopped the
-- loop with
--
--   42P17: infinite recursion detected in policy for relation "orders"
--
-- Every read that touches `orders` failed with it, customers' own cards
-- included — not only the installer's. The same loop reached `profiles`,
-- because 0016's policy joins the two tables as well.
--
-- The fix is the pattern `current_user_role()` already uses in 0001: move the
-- lookup into a `security definer` function, which runs with the definer's
-- rights and therefore does not re-enter RLS. The policies then contain no
-- reference to a table whose own policy could point back at them.
--
-- The rules themselves are unchanged from 0018: an installer reads an order,
-- its card, its configuration and its customer once the office has handed the
-- job over, and nothing before that.
--
-- Safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Hand-over lookups, outside RLS
-- -----------------------------------------------------------------------------
create or replace function public.order_is_handed_over(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.installation_cards ic where ic.order_id = p_order_id
  );
$$;

create or replace function public.order_card_is_handed_over(p_order_card_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.orders o
      join public.installation_cards ic on ic.order_id = o.id
     where o.order_card_id = p_order_card_id
  );
$$;

create or replace function public.customer_has_handed_over_order(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.orders o
      join public.installation_cards ic on ic.order_id = o.id
     where o.user_id = p_user_id
  );
$$;

grant execute on function public.order_is_handed_over(uuid) to authenticated;
grant execute on function public.order_card_is_handed_over(uuid) to authenticated;
grant execute on function public.customer_has_handed_over_order(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. orders
-- -----------------------------------------------------------------------------
drop policy if exists "orders_select_own_or_staff" on public.orders;
drop policy if exists "orders_select_own_admin_or_handed_over" on public.orders;

create policy "orders_select_own_admin_or_handed_over"
  on public.orders for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'monter'
      and public.order_is_handed_over(orders.id)
    )
  );

-- -----------------------------------------------------------------------------
-- 3. order_cards
-- -----------------------------------------------------------------------------
drop policy if exists "order_cards_select_own_or_staff" on public.order_cards;
drop policy if exists "order_cards_select_own_admin_or_handed_over" on public.order_cards;

create policy "order_cards_select_own_admin_or_handed_over"
  on public.order_cards for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'monter'
      and public.order_card_is_handed_over(order_cards.id)
    )
  );

-- -----------------------------------------------------------------------------
-- 4. order_details
-- -----------------------------------------------------------------------------
drop policy if exists "order_details_select_own_or_staff" on public.order_details;
drop policy if exists "order_details_select_own_admin_or_handed_over" on public.order_details;

create policy "order_details_select_own_admin_or_handed_over"
  on public.order_details for select
  to authenticated
  using (
    public.current_user_role() = 'admin'
    or exists (
      select 1 from public.order_cards oc
       where oc.id = order_details.order_card_id
         and oc.user_id = auth.uid()
    )
    or (
      public.current_user_role() = 'monter'
      and public.order_card_is_handed_over(order_details.order_card_id)
    )
  );

-- -----------------------------------------------------------------------------
-- 5. profiles — 0016's rule, rewritten through the same helper
-- -----------------------------------------------------------------------------
drop policy if exists "profiles_select_self_admin_or_assigned" on public.profiles;

create policy "profiles_select_self_admin_or_assigned"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'monter'
      and public.customer_has_handed_over_order(profiles.id)
    )
  );
