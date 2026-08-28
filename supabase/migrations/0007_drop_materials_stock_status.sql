-- =============================================================================
-- 0007_drop_materials_stock_status.sql
-- Drop `materials.stock_status`. The column was carried from the database
-- through the API into the `Material` entity, but nothing ever read it: no
-- badge, no filter, no sort, no validation.
--
-- DESTRUCTIVE: the per-material availability flags are lost. Export the column
-- first if those values still mean something.
--
-- Run this only against a deployment whose backend no longer selects the
-- column, otherwise `GET /api/materials` fails until the new code is live.
--
-- Safe to re-run.
-- =============================================================================

alter table public.materials drop column if exists stock_status;
