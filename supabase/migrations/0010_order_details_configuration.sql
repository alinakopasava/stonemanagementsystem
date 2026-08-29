-- =============================================================================
-- 0010_order_details_configuration.sql
-- Store the whole configuration the customer built, not a quarter of it.
--
-- `order_details` kept four fields: material, dimensions, inscription and
-- finish. The configurator collects far more — the silhouette of the stela, the
-- base it stands on, the slab, the flowerbed, the decoration and its niche, the
-- lettering style, and for a double monument the second inscription. All of it
-- drove the 3D preview, none of it survived the submission, so the workshop
-- could not be told what shape to cut.
--
-- Every column is nullable: rows submitted before this migration keep whatever
-- they had, and the reader treats a null as "not specified". The check
-- constraints allow null for the same reason, and mirror the sets the backend
-- validates against — the vocabulary is written down once here and once in
-- submit-order.service.js, and a value that passes one has to pass the other.
--
-- Thickness of the stela is NOT here: `dimensions` already carries an optional
-- third component (`100x60x8`), which the format has accepted since the start.
--
-- Photographs for a portrait engraving are also NOT here. They need a storage
-- bucket and an upload step of their own, the way installation photos work.
--
-- Safe to re-run.
-- =============================================================================

alter table public.order_details
  add column if not exists shape                     text,
  add column if not exists inscription_style         text,
  add column if not exists layout                    text,
  add column if not exists secondary_inscription_text text,
  add column if not exists double_gap_cm             numeric(5, 1),
  add column if not exists slab_variant              text,
  add column if not exists slab_thickness_cm         numeric(5, 1),
  add column if not exists base_height_cm            numeric(5, 1),
  add column if not exists base_width_cm             numeric(5, 1),
  add column if not exists base_depth_cm             numeric(5, 1),
  add column if not exists decoration                text,
  add column if not exists niche_style               text,
  add column if not exists has_cross                 boolean,
  add column if not exists has_flowerbed             boolean;

-- The silhouette the workshop cuts. Only the shapes actually offered for sale
-- are accepted; the renderer knows thirteen, the storefront sells three, and it
-- is the storefront that decides what a customer can order.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_details_shape_check'
  ) then
    alter table public.order_details
      add constraint order_details_shape_check
      check (shape is null or shape in ('classic', 'rounded', 'stele'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_details_inscription_style_check'
  ) then
    alter table public.order_details
      add constraint order_details_inscription_style_check
      check (
        inscription_style is null
        or inscription_style in ('roman', 'elegant', 'script', 'classic', 'gothic')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_details_layout_check'
  ) then
    alter table public.order_details
      add constraint order_details_layout_check
      check (layout is null or layout in ('single', 'double'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_details_slab_variant_check'
  ) then
    alter table public.order_details
      add constraint order_details_slab_variant_check
      check (slab_variant is null or slab_variant in ('none', 'half', 'full'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_details_decoration_check'
  ) then
    alter table public.order_details
      add constraint order_details_decoration_check
      check (decoration is null or decoration in ('none', 'portrait', 'medallion', 'cross'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_details_niche_style_check'
  ) then
    alter table public.order_details
      add constraint order_details_niche_style_check
      check (niche_style is null or niche_style in ('recessed', 'framed'));
  end if;
end $$;

-- Centimetres, never negative. A stone cannot be ordered at minus five, and a
-- typo that reaches production is expensive in granite.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_details_measurements_check'
  ) then
    alter table public.order_details
      add constraint order_details_measurements_check
      check (
        (double_gap_cm     is null or double_gap_cm     between 0 and 500)
        and (slab_thickness_cm is null or slab_thickness_cm between 0 and 100)
        and (base_height_cm    is null or base_height_cm    between 0 and 500)
        and (base_width_cm     is null or base_width_cm     between 0 and 500)
        and (base_depth_cm     is null or base_depth_cm     between 0 and 500)
      );
  end if;
end $$;
