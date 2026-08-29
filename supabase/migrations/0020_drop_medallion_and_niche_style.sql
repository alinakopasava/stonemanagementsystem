-- Medallion and the framed niche leave the catalogue.
--
-- Both were offered in the configurator early on and were withdrawn: the
-- medallion duplicated the portrait (the same photograph, transferred into the
-- same stone) and the frame was a mounting variant the workshop does not cut.
-- The renderer, the price formula and the interface no longer know either of
-- them, so the schema should not keep accepting them.
--
-- Existing rows are not discarded. A medallion order was a photograph on the
-- face, which is exactly what a portrait order is, so it is carried over rather
-- than blanked: the workshop keeps a readable job description either way.

begin;

-- Nothing may be written under the old names while the rows are being moved.
alter table public.order_details
  drop constraint if exists order_details_decoration_check;

update public.order_details
set decoration = 'portrait'
where decoration = 'medallion';

alter table public.order_details
  add constraint order_details_decoration_check
  check (decoration is null or decoration in ('none', 'portrait', 'cross'));

-- The mounting style has no counterpart left in the application. The column
-- goes with its constraint rather than lingering as a field nothing writes.
alter table public.order_details
  drop constraint if exists order_details_niche_style_check;

alter table public.order_details
  drop column if exists niche_style;

commit;
