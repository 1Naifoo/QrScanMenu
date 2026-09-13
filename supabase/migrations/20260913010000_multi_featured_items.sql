-- Admin can now feature more than one item in the customer site's "See
-- what's inside" section, instead of picking exactly one.
alter table restaurants add column if not exists featured_item_ids uuid[] not null default '{}';

update restaurants
  set featured_item_ids = array[featured_item_id]
  where featured_item_id is not null and featured_item_ids = '{}';

alter table restaurants drop column if exists featured_item_id;
