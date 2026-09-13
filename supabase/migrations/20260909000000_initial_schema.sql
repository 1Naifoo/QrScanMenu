-- ScanMenu — initial schema
--
-- One shared, multi-tenant Supabase project (not one project per client).
-- Every table is scoped per-restaurant via restaurant_admins, so a client's
-- own staff can eventually log in and see/manage only their restaurant,
-- while the template owner (an admin on every restaurant) can manage all
-- of them from the same "restaurant switcher" in the admin panel.

-- ---------------------------------------------------------------------
-- restaurants
-- ---------------------------------------------------------------------
create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,               -- used in yourbrand.com/m/{slug}; stable forever
  name text not null,
  logo_url text,
  language_default text not null default 'en',
  created_at timestamptz not null default now()
);

comment on column restaurants.slug is
  'Permanent, stable identifier used in the public menu URL. Do not repurpose after a QR code has been printed with it.';

-- ---------------------------------------------------------------------
-- restaurant_admins — who can manage which restaurant
-- ---------------------------------------------------------------------
create table if not exists restaurant_admins (
  user_id uuid not null references auth.users (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

comment on table restaurant_admins is
  'Join table scoping each authenticated admin user to the restaurant(s) they may manage. The template owner has a row per client restaurant; client staff eventually get a row for just their own restaurant.';

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists categories_restaurant_id_idx on categories (restaurant_id);

-- ---------------------------------------------------------------------
-- items
-- ---------------------------------------------------------------------
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  category_id uuid references categories (id) on delete set null,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  is_spicy boolean not null default false,
  is_available boolean not null default true,
  photo_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_restaurant_id_idx on items (restaurant_id);
create index if not exists items_category_id_idx on items (category_id);

-- Keep updated_at current on every edit, so "last updated" is always accurate
-- without the admin panel having to set it manually.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists items_set_updated_at on items;
create trigger items_set_updated_at
  before update on items
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
--
-- Nothing here is readable or writable by anon/public — the customer-facing
-- app never queries Supabase directly (it reads generated static files
-- instead), so there is no need for a public read policy on any table.
-- Only authenticated admins, scoped to their own restaurant(s), and the
-- service-role key (used only by the build script) can touch this data.
-- ---------------------------------------------------------------------
alter table restaurants enable row level security;
alter table restaurant_admins enable row level security;
alter table categories enable row level security;
alter table items enable row level security;

-- restaurant_admins: a user can only ever see their own membership rows.
-- (Deliberately NOT joined back through itself, to avoid recursive RLS.)
create policy "admins see their own admin rows"
  on restaurant_admins for select
  using (user_id = auth.uid());

-- Only the service-role key manages who is an admin of what (onboarding a
-- new client, or adding client staff) — no insert/update/delete policy is
-- defined for authenticated users, so those actions are denied by default
-- for anyone but the service role, which bypasses RLS entirely.

-- restaurants: admins can view and update their own restaurant's details
-- (e.g. name, logo). Creating/deleting a restaurant is a service-role-only
-- onboarding action, not something exposed in the admin panel.
create policy "admins can view their restaurant"
  on restaurants for select
  using (
    exists (
      select 1 from restaurant_admins ra
      where ra.restaurant_id = restaurants.id
        and ra.user_id = auth.uid()
    )
  );

create policy "admins can update their restaurant"
  on restaurants for update
  using (
    exists (
      select 1 from restaurant_admins ra
      where ra.restaurant_id = restaurants.id
        and ra.user_id = auth.uid()
    )
  );

-- categories: full CRUD, scoped to restaurants the user administers.
create policy "admins manage their categories"
  on categories for all
  using (
    exists (
      select 1 from restaurant_admins ra
      where ra.restaurant_id = categories.restaurant_id
        and ra.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from restaurant_admins ra
      where ra.restaurant_id = categories.restaurant_id
        and ra.user_id = auth.uid()
    )
  );

-- items: full CRUD, scoped to restaurants the user administers.
create policy "admins manage their items"
  on items for all
  using (
    exists (
      select 1 from restaurant_admins ra
      where ra.restaurant_id = items.restaurant_id
        and ra.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from restaurant_admins ra
      where ra.restaurant_id = items.restaurant_id
        and ra.user_id = auth.uid()
    )
  );
