-- =============================================================================
-- 0004_order_cards_created_at.sql
-- Record when a customer submitted an order card.
--
-- `order_cards` held only (id, user_id), so the office could not tell how long
-- a card had been waiting, and the list had to be sorted by id. Existing rows
-- are backfilled from the order they were converted into, where there is one;
-- the rest fall back to the moment this runs, which is the earliest instant we
-- can honestly claim to know about.
-- Safe to re-run.
-- =============================================================================

alter table public.order_cards
  add column if not exists created_at timestamptz;

-- Cards already turned into an order inherit that order's timestamp.
update public.order_cards c
set created_at = o.created_at
from public.orders o
where o.order_card_id = c.id
  and c.created_at is null
  and o.created_at is not null;

-- Anything still unknown gets the migration time rather than a fake past date.
update public.order_cards
set created_at = now()
where created_at is null;

alter table public.order_cards
  alter column created_at set default now();

alter table public.order_cards
  alter column created_at set not null;

create index if not exists idx_order_cards_created_at
  on public.order_cards (created_at desc);
