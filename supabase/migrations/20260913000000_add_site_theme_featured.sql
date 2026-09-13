-- Three admin-editable additions to a restaurant:
--
-- site_url — the live customer-facing site's URL (e.g. the Vercel deploy
-- domain). Shown as a link in the admin sidebar and used as the QR code
-- print target — there's no way to derive this automatically since each
-- client's customer app is deployed independently.
--
-- theme — overrides the color values baked into that client's
-- client.config.json at template-copy time, so an admin can restyle their
-- site's colors/background without a code change. Same shape as the
-- "theme" object in client.config.json (background, surface, surfaceCard,
-- textOnDark, nameColor, priceColor, accent, danger); any key present
-- here wins over the file's value at build time. Fonts stay file-only —
-- not exposed for editing here.
--
-- featured_item_id — which dish shows in the "See what's inside" card on
-- Menu Home, chosen explicitly instead of the previous auto-picked
-- heuristic (first available item with a photo and ingredients).

alter table restaurants
  add column if not exists site_url text,
  add column if not exists theme jsonb not null default '{}',
  add column if not exists featured_item_id uuid references items (id) on delete set null;

comment on column restaurants.site_url is
  'Live URL of this restaurant''s deployed customer-facing site. Shown as a link in the admin sidebar and used for the printable QR code.';
comment on column restaurants.theme is
  'Color overrides for the customer site, merged over client.config.json''s theme at build time. Shape: { background, surface, surfaceCard, textOnDark, nameColor, priceColor, accent, danger } — any subset. Empty object means "use the file''s defaults".';
comment on column restaurants.featured_item_id is
  'Item shown in the "See what''s inside" card on the customer site''s Menu Home. Null falls back to the previous auto-pick heuristic.';
