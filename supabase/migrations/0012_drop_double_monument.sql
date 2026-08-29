-- =============================================================================
-- 0012_drop_double_monument.sql
-- Withdraw the double monument.
--
-- The configurator could compose two stelas on one base, with a second
-- inscription and an adjustable gap between them. Nothing in the requirements
-- ever described that product, so it was offered without a price, without a
-- requirement card and without a test of its own. Rather than document a
-- variant the workshop was never asked to quote, the option is withdrawn and
-- its columns go with it.
--
-- DESTRUCTIVE: any second inscription already stored is lost. Read the three
-- columns out first if a card in the system used them:
--
--   select id, order_card_id, layout, secondary_inscription_text, double_gap_cm
--     from public.order_details
--    where layout = 'double';
--
-- Safe to re-run.
-- =============================================================================

alter table public.order_details
  drop column if exists layout,
  drop column if exists secondary_inscription_text,
  drop column if exists double_gap_cm;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'order_details_layout_check') then
    alter table public.order_details drop constraint order_details_layout_check;
  end if;
end $$;
