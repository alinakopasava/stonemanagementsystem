-- =============================================================================
-- 0017_order_card_delete_cascade.sql
-- Deleting an order card takes its configuration with it.
--
-- `deleteOrderCard` issues a single `delete from order_cards`, and every card
-- has a row in `order_details`, so the delete is rejected by the foreign key
-- unless that key cascades. It does not: migration 0001 declares the constraint
-- WITH `on delete cascade`, but wraps the statement in a
-- `if not exists (select 1 from pg_constraint ...)` guard, and the constraint
-- already existed — created in the Supabase console without the clause. The
-- guard skipped it silently, so the intent in 0001 never reached the database.
-- FA4 has therefore been failing against the real schema; the integration test
-- passes because it runs against a mocked client.
--
-- Only `order_details` gets the cascade. 0001 also intended one on
-- `orders.order_card_id`, and that one is deliberately NOT restored: a card
-- that became a production order must not be deletable, and a foreign key with
-- no cascade is what makes the database refuse it. `deleteOrderCard` already
-- refuses in the service layer, and this leaves the same rule enforced a second
-- time, below it. Cascading there would quietly delete the order and — through
-- `installation_cards.order_id` — the installation card as well.
--
-- Safe to re-run.
-- =============================================================================

alter table public.order_details
  drop constraint if exists order_details_order_card_id_fkey;

alter table public.order_details
  add constraint order_details_order_card_id_fkey
    foreign key (order_card_id) references public.order_cards(id) on delete cascade;
