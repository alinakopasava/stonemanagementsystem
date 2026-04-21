-- =============================================================================
-- 0001_auth_and_rls.sql
-- Authentication hardening + Row Level Security for Signature Stone.
-- Run once in Supabase SQL editor on an empty (or already-populated) project.
-- Safe to re-run: everything uses IF NOT EXISTS / DO $$ ... $$ guards.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. user_role enum
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('klient', 'monter', 'admin');
  else
    -- make sure all three values exist on a pre-existing enum
    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'user_role' and e.enumlabel = 'klient'
    ) then alter type public.user_role add value 'klient'; end if;
    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'user_role' and e.enumlabel = 'monter'
    ) then alter type public.user_role add value 'monter'; end if;
    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'user_role' and e.enumlabel = 'admin'
    ) then alter type public.user_role add value 'admin'; end if;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. profiles: FK to auth.users, NOT NULL defaults, created_at
-- -----------------------------------------------------------------------------
-- FK: profiles.id -> auth.users(id)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- Default role + NOT NULL
alter table public.profiles
  alter column role set default 'klient'::public.user_role;

update public.profiles set role = 'klient' where role is null;

alter table public.profiles
  alter column role set not null;

-- created_at default + NOT NULL
alter table public.profiles
  alter column created_at set default now();

update public.profiles set created_at = now() where created_at is null;

alter table public.profiles
  alter column created_at set not null;

-- -----------------------------------------------------------------------------
-- 3. Auto-create a profile row whenever a new auth.users row is inserted.
--    Role can be passed through raw_user_meta_data.role at sign-up time,
--    but defaults to 'klient' and cannot be 'admin' or 'monter' from public
--    sign-up (admins must be promoted manually).
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  final_role public.user_role;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'klient');

  -- Only 'klient' is allowed through self-signup. Anything else is forced back.
  if requested_role = 'klient' then
    final_role := 'klient'::public.user_role;
  else
    final_role := 'klient'::public.user_role;
  end if;

  insert into public.profiles (id, first_name, last_name, phone_number, role, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone_number', null),
    final_role,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 4. FKs + NOT NULLs on order tables
-- -----------------------------------------------------------------------------
-- order_cards.user_id -> auth.users(id)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_cards_user_id_fkey'
  ) then
    alter table public.order_cards
      add constraint order_cards_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end $$;

-- orders.user_id -> auth.users(id)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_user_id_fkey'
  ) then
    alter table public.orders
      add constraint orders_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end $$;

-- orders.order_card_id -> order_cards(id)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_order_card_id_fkey'
  ) then
    alter table public.orders
      add constraint orders_order_card_id_fkey
      foreign key (order_card_id) references public.order_cards(id) on delete cascade;
  end if;
end $$;

-- order_details.order_card_id -> order_cards(id)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_details_order_card_id_fkey'
  ) then
    alter table public.order_details
      add constraint order_details_order_card_id_fkey
      foreign key (order_card_id) references public.order_cards(id) on delete cascade;
  end if;
end $$;

-- order_details.material_id -> materials(id)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_details_material_id_fkey'
  ) then
    alter table public.order_details
      add constraint order_details_material_id_fkey
      foreign key (material_id) references public.materials(id) on delete restrict;
  end if;
end $$;

-- installation_cards.order_id -> orders(id)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'installation_cards_order_id_fkey'
  ) then
    alter table public.installation_cards
      add constraint installation_cards_order_id_fkey
      foreign key (order_id) references public.orders(id) on delete cascade;
  end if;
end $$;

-- Helpful indexes for RLS
create index if not exists idx_order_cards_user_id on public.order_cards(user_id);
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_order_card_id on public.orders(order_card_id);
create index if not exists idx_order_details_order_card_id on public.order_details(order_card_id);
create index if not exists idx_installation_cards_order_id on public.installation_cards(order_id);

-- -----------------------------------------------------------------------------
-- 5. Helper: current user's role (SECURITY DEFINER bypasses RLS on profiles
--    so policies can reference it without recursion).
-- -----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_user_role() to authenticated, anon;

-- -----------------------------------------------------------------------------
-- 6. RLS: enable + force on every business table
-- -----------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.materials           enable row level security;
alter table public.products            enable row level security;
alter table public.order_cards         enable row level security;
alter table public.order_details       enable row level security;
alter table public.orders              enable row level security;
alter table public.installation_cards  enable row level security;

-- Wipe any previous policies so this migration is idempotent
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles','materials','products','order_cards',
        'order_details','orders','installation_cards'
      )
  loop
    execute format('drop policy if exists %I on %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- --------------------------- profiles ---------------------------------------
-- Users can see their own profile; admins and monters see all (for worklists).
create policy "profiles_select_self_or_staff"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or public.current_user_role() in ('admin', 'monter')
  );

-- Users can update their own profile, but cannot change their role.
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
  );

-- Only admins can update arbitrary profiles (including role changes).
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- No direct INSERT from clients: the trigger inserts on signup.
-- No DELETE: ON DELETE CASCADE from auth.users handles it.

-- --------------------------- materials & products ---------------------------
-- Public catalog: anyone (even unauthenticated) can read.
create policy "materials_select_public"
  on public.materials for select
  to anon, authenticated
  using (true);

create policy "materials_admin_write"
  on public.materials for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "products_select_public"
  on public.products for select
  to anon, authenticated
  using (true);

create policy "products_admin_write"
  on public.products for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- --------------------------- order_cards -----------------------------------
create policy "order_cards_select_own_or_staff"
  on public.order_cards for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_role() in ('admin', 'monter')
  );

-- Clients can create their own cards; staff can create on anyone's behalf.
create policy "order_cards_insert_own_or_staff"
  on public.order_cards for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or public.current_user_role() in ('admin', 'monter')
  );

create policy "order_cards_update_staff"
  on public.order_cards for update
  to authenticated
  using (public.current_user_role() in ('admin', 'monter'))
  with check (public.current_user_role() in ('admin', 'monter'));

create policy "order_cards_delete_admin"
  on public.order_cards for delete
  to authenticated
  using (public.current_user_role() = 'admin');

-- --------------------------- order_details ---------------------------------
create policy "order_details_select_own_or_staff"
  on public.order_details for select
  to authenticated
  using (
    public.current_user_role() in ('admin', 'monter')
    or exists (
      select 1 from public.order_cards oc
      where oc.id = order_details.order_card_id
        and oc.user_id = auth.uid()
    )
  );

create policy "order_details_insert_own_or_staff"
  on public.order_details for insert
  to authenticated
  with check (
    public.current_user_role() in ('admin', 'monter')
    or exists (
      select 1 from public.order_cards oc
      where oc.id = order_details.order_card_id
        and oc.user_id = auth.uid()
    )
  );

create policy "order_details_update_staff"
  on public.order_details for update
  to authenticated
  using (public.current_user_role() in ('admin', 'monter'))
  with check (public.current_user_role() in ('admin', 'monter'));

create policy "order_details_delete_admin"
  on public.order_details for delete
  to authenticated
  using (public.current_user_role() = 'admin');

-- --------------------------- orders ----------------------------------------
create policy "orders_select_own_or_staff"
  on public.orders for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_role() in ('admin', 'monter')
  );

-- Client creates their own order; staff can create for any user.
create policy "orders_insert_own_or_staff"
  on public.orders for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or public.current_user_role() in ('admin', 'monter')
  );

-- Only staff change order status / price / deadline / address.
create policy "orders_update_staff"
  on public.orders for update
  to authenticated
  using (public.current_user_role() in ('admin', 'monter'))
  with check (public.current_user_role() in ('admin', 'monter'));

create policy "orders_delete_admin"
  on public.orders for delete
  to authenticated
  using (public.current_user_role() = 'admin');

-- --------------------------- installation_cards ----------------------------
create policy "installation_cards_select_own_or_staff"
  on public.installation_cards for select
  to authenticated
  using (
    public.current_user_role() in ('admin', 'monter')
    or exists (
      select 1 from public.orders o
      where o.id = installation_cards.order_id
        and o.user_id = auth.uid()
    )
  );

create policy "installation_cards_insert_staff"
  on public.installation_cards for insert
  to authenticated
  with check (public.current_user_role() in ('admin', 'monter'));

create policy "installation_cards_update_staff"
  on public.installation_cards for update
  to authenticated
  using (public.current_user_role() in ('admin', 'monter'))
  with check (public.current_user_role() in ('admin', 'monter'));

create policy "installation_cards_delete_admin"
  on public.installation_cards for delete
  to authenticated
  using (public.current_user_role() = 'admin');
