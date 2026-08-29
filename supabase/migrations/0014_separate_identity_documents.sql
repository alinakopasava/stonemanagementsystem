-- =============================================================================
-- 0014_separate_identity_documents.sql
-- Identity-document data moves out of `orders` into a table only the office
-- can read.
--
-- The problem this closes: RLS in PostgreSQL is row-level, not column-level.
-- `orders_select_own_or_staff` grants `monter` the whole row, so the series and
-- number of a customer's passport were readable by any installer who called
-- PostgREST with their own JWT. That they never saw them in the application was
-- down to `INSTALLATION_ORDER_SELECT` omitting the two columns — a decision in
-- application code, one query away from being undone by someone adding a field
-- to a select list without knowing why it was missing. Migration 0008 closed
-- exactly this shape of hole for UPDATE and left SELECT open.
--
-- Column-level grants cannot fix it either: every logged-in user shares the one
-- `authenticated` role, so a grant that hides a column from installers hides it
-- from the office too. Moving the data to its own table gives it its own
-- policies, and "the office only" becomes something the database enforces
-- rather than something each query has to remember.
--
-- `client_full_name` deliberately stays on `orders`. It is not document data,
-- and the installation crew is shown it on purpose — they need to know whose
-- grave they are working on.
--
-- Existing values are copied before the columns are dropped. Rows where both
-- fields are empty produce no row here: absence of a document is stored as the
-- absence of a record, not as a row full of nulls.
--
-- DESTRUCTIVE: `orders.passport_series` and `orders.passport_number` are
-- dropped at the end. Run the copy and verify it before dropping if the table
-- holds real contracts:
--
--   select count(*) from public.orders
--    where coalesce(passport_series, passport_number) is not null;
--   select count(*) from public.order_identity_documents;
--
-- Safe to re-run.
-- =============================================================================

create table if not exists public.order_identity_documents (
  order_id uuid primary key
    references public.orders(id) on delete cascade,
  passport_series text,
  passport_number text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint order_identity_documents_series_check
    check (passport_series is null or length(passport_series) <= 16),
  constraint order_identity_documents_number_check
    check (passport_number is null or length(passport_number) <= 32)
);

comment on table public.order_identity_documents is
  'Identity-document data for the contract behind an order. Office only: no '
  'policy grants monter or klient any access. One row per order, at most.';

-- -----------------------------------------------------------------------------
-- Carry existing values across
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'orders'
       and column_name = 'passport_series'
  ) then
    insert into public.order_identity_documents (order_id, passport_series, passport_number)
    select id, passport_series, passport_number
      from public.orders
     where coalesce(passport_series, passport_number) is not null
    on conflict (order_id) do nothing;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Office only, on every operation
-- -----------------------------------------------------------------------------
alter table public.order_identity_documents enable row level security;

drop policy if exists "order_identity_documents_select_admin"
  on public.order_identity_documents;
drop policy if exists "order_identity_documents_insert_admin"
  on public.order_identity_documents;
drop policy if exists "order_identity_documents_update_admin"
  on public.order_identity_documents;
drop policy if exists "order_identity_documents_delete_admin"
  on public.order_identity_documents;

create policy "order_identity_documents_select_admin"
  on public.order_identity_documents for select
  to authenticated
  using (public.current_user_role() = 'admin');

create policy "order_identity_documents_insert_admin"
  on public.order_identity_documents for insert
  to authenticated
  with check (public.current_user_role() = 'admin');

create policy "order_identity_documents_update_admin"
  on public.order_identity_documents for update
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "order_identity_documents_delete_admin"
  on public.order_identity_documents for delete
  to authenticated
  using (public.current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- Retire the old columns
-- -----------------------------------------------------------------------------
alter table public.orders
  drop constraint if exists orders_passport_series_check,
  drop constraint if exists orders_passport_number_check;

alter table public.orders
  drop column if exists passport_series,
  drop column if exists passport_number;
