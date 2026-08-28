-- =============================================================================
-- 0003_auth_hardening.sql
-- Tighten SECURITY DEFINER grants.
-- Safe to re-run.
-- =============================================================================

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;
grant execute on function public.handle_new_user() to postgres, supabase_auth_admin;

revoke all on function public.current_user_role() from public;
revoke all on function public.current_user_role() from anon;
grant execute on function public.current_user_role() to authenticated;
