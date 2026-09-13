-- The customer site's featured-item card used to auto-list an item's
-- ingredients. Admins can now write their own short blurb for that card
-- instead, in both languages.
alter table items add column if not exists featured_caption text;
alter table items add column if not exists featured_caption_ar text;
