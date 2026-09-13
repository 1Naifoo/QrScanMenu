-- Adds a per-dish ingredients list, shown on the customer-facing site
-- (e.g. the "See what's inside" breakdown on Menu Home / Dish Details).
-- One ingredient per array element, in display order.

alter table items
  add column if not exists ingredients text[] not null default '{}';

comment on column items.ingredients is
  'Ordered list of ingredients shown on the customer-facing site (e.g. "Sesame bun", "Crisp lettuce"). Empty array if not set.';
