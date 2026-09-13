-- Customer-selectable option groups per dish (e.g. Milk Type: Low Fat,
-- Full Fat, Oat Milk — or Roast: Light, Medium, Dark), defined freely by
-- the restaurant's own admin rather than a fixed set of choices. Each
-- group is single-select and required before a customer can add the item
-- to their list — see apps/customer/src/pages/dishDetail.js.
--
-- Shape: [{ "name": "Milk Type", "choices": ["Low Fat", "Full Fat", "Oat Milk"] }, ...]

alter table items
  add column if not exists options jsonb not null default '[]';

comment on column items.options is
  'Customer-selectable option groups for this dish. Array of { name, choices: string[] }. Each group is single-select and required before adding to the customer''s list.';
