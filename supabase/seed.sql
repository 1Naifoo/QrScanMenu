-- Sample data for local testing only — NOT run automatically against your
-- real Supabase project. Run manually (`supabase db reset` locally, or
-- paste into the SQL editor on a throwaway/dev project) once you have a
-- real auth user to attach as the admin.
--
-- Replace 'PASTE-YOUR-AUTH-USER-UUID-HERE' with the UUID of a user created
-- via Supabase Auth (Authentication -> Users in the dashboard, or by
-- signing up once the Login screen exists).

insert into restaurants (slug, name, language_default)
values ('olive-garden-grill', 'Olive Garden Grill', 'en')
returning id \gset restaurant_

-- If \gset isn't available in your SQL runner, just copy the returned id
-- and paste it in place of the subqueries below.

insert into restaurant_admins (user_id, restaurant_id, role)
select 'PASTE-YOUR-AUTH-USER-UUID-HERE'::uuid, id, 'owner'
from restaurants where slug = 'olive-garden-grill';

insert into categories (restaurant_id, name, sort_order)
select id, 'Burgers', 1 from restaurants where slug = 'olive-garden-grill';

insert into items (restaurant_id, category_id, name, description, price, is_spicy, sort_order)
select
  r.id,
  c.id,
  'Spicy Bacon Cheeseburger',
  'A juicy beef patty with crispy bacon and melted cheddar, piled with fresh lettuce and tomato and a spicy mayo drizzle on a toasted brioche bun.',
  23.00,
  true,
  1
from restaurants r
join categories c on c.restaurant_id = r.id and c.name = 'Burgers'
where r.slug = 'olive-garden-grill';
