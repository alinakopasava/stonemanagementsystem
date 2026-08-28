-- =============================================================================
-- 0005_installation_photos_bucket.sql
-- Private storage bucket for the photographs an installer takes on site.
--
-- The bucket is deliberately NOT public: these are pictures of a named
-- customer's grave, and a public bucket means a guessable URL is enough to
-- read them. Nothing reaches Storage directly from a browser — the API uploads
-- with the service role after checking the caller's role, and hands out
-- short-lived signed links on read. With no policies on storage.objects for
-- `authenticated` or `anon`, RLS denies every other route in by default.
-- Safe to re-run.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'installation-photos',
  'installation-photos',
  false,
  8388608,                                    -- 8 MB, matched by the API
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
