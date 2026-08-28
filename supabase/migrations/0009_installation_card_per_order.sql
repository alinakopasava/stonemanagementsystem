-- =============================================================================
-- 0009_installation_card_per_order.sql
-- One installation card per order, enforced by the database.
--
-- Three code paths — the hand-over, the site report and the photo upload — all
-- decided whether to insert or update by reading `installation_cards` first.
-- Two of them running at once both read "no card" and both insert, and since
-- the reader takes the first row it finds, one crew's report and photograph
-- quietly stop being visible.
--
-- The same gap was closed for `orders.order_card_id` in 0008; this is its twin,
-- one table further down the chain.
--
-- Safe to re-run.
-- =============================================================================

do $$
declare
  duplicates text;
begin
  if not exists (
    select 1 from pg_constraint where conname = 'installation_cards_order_id_key'
  ) then
    -- Name the offending orders rather than letting Postgres report the
    -- constraint failure without saying which rows caused it.
    select string_agg(order_id::text, ', ')
      into duplicates
      from (
        select order_id
        from public.installation_cards
        where order_id is not null
        group by order_id
        having count(*) > 1
      ) d;

    if duplicates is not null then
      raise exception
        'Cannot add the unique constraint: these orders already have more than one installation card: %. Merge or delete the extra rows first, then re-run this migration.',
        duplicates;
    end if;

    alter table public.installation_cards
      add constraint installation_cards_order_id_key unique (order_id);
  end if;
end $$;
