# ScanMenu

A QR-code digital menu platform for restaurants and coffee shops, with a
login-protected admin panel for managing content.

## The architecture, in one paragraph

There is **one** admin panel and **one** shared Supabase database, used by
every client. There is **not** one customer-facing site — every new
client gets their own duplicated copy of `apps/customer` as its own
separate repo (same code, different logo/colors/menu), each pulling only
its own restaurant's data from that same shared database at build time.
This repo (`apps/admin` + `supabase/` + `packages/shared`) is where you
manage all clients from; `apps/customer` is the template you copy outward
each time you onboard a new one.

```
                    ┌─────────────────────────┐
                    │   Shared Supabase DB     │
                    │ (restaurants, categories,│
                    │  items, restaurant_admins)│
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
     ┌────────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐
     │  Admin panel    │  │ Client A's   │  │ Client B's   │
     │ (this repo,     │  │ customer repo│  │ customer repo│
     │  ONE deployment)│  │ (own colors, │  │ (own colors, │
     │  manages ALL    │  │  own domain) │  │  own domain) │
     │  clients        │  └──────────────┘  └──────────────┘
     └─────────────────┘
```

## Folder structure (this repo)

```
scanmenu/
├── apps/
│   ├── admin/            # Shared admin panel — Login, Menu Items, Edit Item
│   └── customer/         # TEMPLATE — duplicate this per client, see apps/customer/README.md
├── packages/
│   └── shared/           # Supabase client helpers used by admin + build scripts
├── supabase/
│   ├── config.toml        # Local dev config
│   ├── seed.sql            # Sample restaurant/category/item for testing
│   └── migrations/         # Schema, Row Level Security, storage setup
├── .env.example             # Root/build-time secrets template
└── package.json              # npm workspaces root
```

## Getting started

```bash
npm install

# Admin panel — needs apps/admin/.env, see apps/admin/.env.example
npm run dev:admin

# Customer template — for local development of the template itself.
# To actually onboard a new client, copy apps/customer out to its own
# repo instead — see apps/customer/README.md.
npm run dev:customer
```

## Database schema

Defined in `supabase/migrations/`:

- **`restaurants`** — one row per client (slug, name, logo, language, deploy webhook URL)
- **`restaurant_admins`** — which auth user can manage which restaurant(s); scopes every admin to only their own client(s), and is what lets a client's own staff eventually log in and see just their restaurant
- **`categories`** / **`items`** — per-restaurant menu content
- **Storage** — a public-read `dish-photos` bucket, with writes restricted to admins of the matching restaurant folder

Nothing here is publicly readable via the API — the customer-facing sites
never query Supabase directly at runtime; they read static `menu.json`
files generated at build time (see `apps/customer/scripts/generate-static.js`).

## Publishing a menu change

1. An admin edits a dish in the admin panel → written to Supabase.
2. The admin panel's "Publish Changes" button calls that restaurant's
   `deploy_webhook_url` (a Vercel/Netlify deploy hook, typically).
3. That client's own repo rebuilds: `generate-static.js` re-pulls just its
   restaurant's data, and the static site redeploys with the new content.

If a restaurant has no deploy hook configured yet, edits still save —
they just won't appear live until the next manual rebuild.

## Onboarding a new client — quick checklist

1. Insert a new row into `restaurants` (or ask an existing admin to do it
   via a future "add restaurant" admin feature — for now, via SQL/dashboard).
2. Insert a matching row into `restaurant_admins` linking the client's (or
   your own) auth user to that restaurant.
3. Duplicate `apps/customer` into a new repo; set `client.config.json`
   (`restaurantSlug` + `theme`) and the build secrets.
4. Deploy; set `deploy_webhook_url` on that restaurant's row so Publish
   Changes works from the admin panel.
5. Generate and print that client's QR code, pointing at their new site's URL.

## Security

- Row Level Security on every table — an admin only ever sees the
  restaurant(s) they're linked to via `restaurant_admins`.
- The service-role key (full database access, bypasses RLS) is used only
  by each client's build-time `generate-static.js` — never in a browser.
- Customer-facing sites make zero live calls to Supabase.

## Fallback

If Supabase or the admin panel is ever unavailable, a client's
`menu.json`/`theme.json` can still be hand-edited directly and the site
rebuilt/redeployed manually — the customer-facing site doesn't care how
those files were produced.
