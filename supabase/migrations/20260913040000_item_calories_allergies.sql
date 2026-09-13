-- Nutritional info an admin can optionally fill in per item, shown on the
-- customer site's dish detail screen before adding to the list.
alter table items add column if not exists calories integer;
alter table items add column if not exists allergies text;
alter table items add column if not exists allergies_ar text;
