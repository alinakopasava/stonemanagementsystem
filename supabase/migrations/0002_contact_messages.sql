-- =============================================================================
-- 0002_contact_messages.sql
-- Persistent storage for the public contact form on the landing page.
-- Run once in Supabase SQL editor. Safe to re-run (idempotent).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. contact_message_status enum
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'contact_message_status') then
    create type public.contact_message_status as enum ('new', 'read', 'archived');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. contact_messages table
-- -----------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null check (length(name) between 1 and 120),
  email       text        not null check (length(email) between 3 and 200),
  phone       text        null     check (phone is null or length(phone) <= 40),
  message     text        not null check (length(message) between 1 and 4000),
  status      public.contact_message_status not null default 'new',
  created_at  timestamptz not null default now(),
  read_at     timestamptz null,
  read_by     uuid        null references auth.users(id) on delete set null
);

-- Useful index for the admin inbox (newest first, filter by status).
create index if not exists idx_contact_messages_created_at
  on public.contact_messages (created_at desc);

create index if not exists idx_contact_messages_status
  on public.contact_messages (status);

-- -----------------------------------------------------------------------------
-- 3. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.contact_messages enable row level security;

-- Wipe any previous policies on this table so the migration is idempotent.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'contact_messages'
  loop
    execute format('drop policy if exists %I on %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Inserts are performed by the backend using the service role key, which
-- bypasses RLS entirely. We therefore do NOT expose an anon/authenticated
-- INSERT policy — that keeps the public from spamming Supabase directly.

-- Only admins can read the inbox.
create policy "contact_messages_select_admin"
  on public.contact_messages for select
  to authenticated
  using (public.current_user_role() = 'admin');

-- Only admins can mark messages as read / archived.
create policy "contact_messages_update_admin"
  on public.contact_messages for update
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Only admins can delete messages.
create policy "contact_messages_delete_admin"
  on public.contact_messages for delete
  to authenticated
  using (public.current_user_role() = 'admin');
