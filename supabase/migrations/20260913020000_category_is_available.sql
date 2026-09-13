-- Admin can now enable/disable a whole category on the customer site,
-- instead of it only disappearing once every item inside it is disabled.
alter table categories add column if not exists is_available boolean not null default true;
