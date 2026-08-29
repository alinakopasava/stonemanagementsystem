-- =============================================================================
-- 0018_installer_reads_handed_over_only.sql
-- An installer reads the jobs they were sent to, and nothing else.
--
-- 0016 narrowed `profiles` so that `monter` sees a customer only once the
-- office has handed their order over. The order itself was left as 0001 wrote
-- it: `orders_select_own_or_staff` grants `monter` every row in the table, and
-- `order_cards` / `order_details` do the same for the configuration behind it.
--
-- The service layer never shows those rows — `listInstallationCards` is an
-- inner join against `installation_cards`, so the worklist contains only what
-- was handed over. But the policy is what an installer's own JWT is judged
-- against, and that JWT is obtainable: the crew know their own password, and
-- Supabase Auth issues a token to anyone who can sign in. With it, PostgREST
-- answers `select * from orders` in full — price, contract terms, installation
-- address and the name on the contract, for every order in the shop, including
-- the ones still being negotiated in the office.
--
-- So the rule the application already follows is moved down into the database:
-- for `monter`, a row is visible when an installation card exists for it. The
-- customer's own access and the office's are untouched.
--
-- Safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- orders
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
      and exists (
        select 1
          from public.installation_cards ic
         where ic.order_id = orders.id
      )
    )
  );

-- -----------------------------------------------------------------------------
-- order_cards: the card an installer may read is the one behind such an order
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
      and exists (
        select 1
          from public.orders o
          join public.installation_cards ic on ic.order_id = o.id
         where o.order_card_id = order_cards.id
      )
    )
  );

-- -----------------------------------------------------------------------------
-- order_details: the monument specification the crew actually needs on site
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
      and exists (
        select 1
          from public.orders o
          join public.installation_cards ic on ic.order_id = o.id
         where o.order_card_id = order_details.order_card_id
      )
    )
  );
