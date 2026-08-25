-- =============================================================================
-- 0003_auth_hardening.sql
-- Tighten SECURITY DEFINER grants and add an append-only audit log.
-- Safe to re-run.
-- =============================================================================

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;
grant execute on function public.handle_new_user() to postgres, supabase_auth_admin;

revoke all on function public.current_user_role() from public;
revoke all on function public.current_user_role() from anon;
grant execute on function public.current_user_role() to authenticated;

create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  actor_id    uuid null references auth.users(id) on delete set null,
  action      text not null,
  entity      text null,
  entity_id   text null,
  ip          text null,
  user_agent  text null,
  metadata    jsonb not null default '{}'::jsonb
);

create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_actor_id on public.audit_logs (actor_id);
create index if not exists idx_audit_logs_action on public.audit_logs (action);

alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'audit_logs'
  loop
    execute format('drop policy if exists %I on %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy "audit_logs_select_admin"
  on public.audit_logs for select
  to authenticated
  using (public.current_user_role() = 'admin');
