-- =============================================================================
-- 0011_monument_photos_bucket.sql
-- Private storage bucket for the portrait a customer attaches in the
-- configurator, plus the column on `order_details` that points at it.
--
-- Migration 0010 gave the workshop every parameter of the stone except one: a
-- monument with `decoration = 'portrait'` or `'medallion'` needs the actual
-- photograph, and until now that file never left the customer's browser. It
-- was read into memory, had its background removed and was projected onto the
-- 3D model; submitting the order dropped it.
--
-- The bucket is private, for the same reason `installation-photos` is: this is
-- a photograph of a named dead person, and a public bucket means a guessable
-- URL is enough to read it. Nothing reaches Storage straight from a browser —
-- the API uploads with the service role after checking who is calling, and
-- hands out short-lived signed links on read. With no policies on
-- storage.objects for `authenticated` or `anon`, RLS denies every other way in.
--
-- Safe to re-run.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'monument-photos',
  'monument-photos',
  false,
  8388608,                                    -- 8 MB, to be matched by the API
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The object path inside the bucket, e.g. `<order_card_id>/<uuid>.png`.
--
-- Named `_path` rather than `_url`, unlike `installation_cards.photo_evidence_url`
-- which carries a path under a name that promises a URL. A real URL here would
-- be a signed link, and those expire — storing one would leave dead strings in
-- the table within the hour.
alter table public.order_details
  add column if not exists photo_path text;
