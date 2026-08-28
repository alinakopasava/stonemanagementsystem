-- =============================================================================
-- 0006_drop_audit_logs.sql
-- Drop the audit log. It was write-only: the backend inserted into it, but no
-- endpoint or screen ever read it back, so the rows served no purpose.
--
-- DESTRUCTIVE: every existing audit row is lost. Export the table first if the
-- history still matters. Dropping the table takes its indexes and the
-- `audit_logs_select_admin` policy with it.
--
-- Safe to re-run.
-- =============================================================================

drop table if exists public.audit_logs;
