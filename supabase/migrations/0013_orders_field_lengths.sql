-- =============================================================================
-- 0013_orders_field_lengths.sql
-- Length limits on the fields the office fills in when converting a card.
--
-- Every text column on `orders` is a bare `text`, so until now nothing capped
-- them at any level: the service trimmed the values and passed them straight
-- through, and the only ceiling in the whole path was the 100 kB body limit on
-- `express.json`.
--
-- `contact_messages` already works this way (see 0002): its name, email,
-- message and phone all carry length checks. This brings `orders` in line, and
-- the limits match `CONVERT_FIELD_MAX_LENGTH` in `admin.service.js` exactly, so
-- a request that skips the backend meets the same wall as one that does not.
--
-- The two passport columns are not covered here: 0014 moves them to their own
-- table, which carries the same limits as its own constraints.
--
-- Existing rows are checked when the constraint is added. If any row is already
-- over a limit the ALTER fails naming the constraint; the query below finds it.
--
--   select id, length(client_full_name), length(installation_address),
--          length(contract_details)
--     from public.orders
--    where length(client_full_name)     > 160
--       or length(installation_address) > 500
--       or length(contract_details)     > 2000;
--
-- Safe to re-run.
-- =============================================================================

alter table public.orders
  drop constraint if exists orders_client_full_name_check,
  drop constraint if exists orders_installation_address_check,
  drop constraint if exists orders_contract_details_check;

-- Each column is optional, so `null` passes; only a present value is measured.
alter table public.orders
  add constraint orders_client_full_name_check
    check (client_full_name is null or length(client_full_name) <= 160),
  add constraint orders_installation_address_check
    check (installation_address is null or length(installation_address) <= 500),
  add constraint orders_contract_details_check
    check (contract_details is null or length(contract_details) <= 2000);
