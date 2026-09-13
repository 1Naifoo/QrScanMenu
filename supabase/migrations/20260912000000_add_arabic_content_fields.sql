-- Bilingual content fields — an admin enters both an English and Arabic
-- name/description directly (no machine translation). The customer site's
-- language toggle switches between them, falling back to the English value
-- when the Arabic one hasn't been filled in yet.

alter table categories
  add column if not exists name_ar text;

alter table items
  add column if not exists name_ar text,
  add column if not exists description_ar text;

comment on column categories.name_ar is
  'Arabic category name shown when the customer site is switched to Arabic. Falls back to name (English) when null/empty.';
comment on column items.name_ar is
  'Arabic dish name shown when the customer site is switched to Arabic. Falls back to name (English) when null/empty.';
comment on column items.description_ar is
  'Arabic dish description shown when the customer site is switched to Arabic. Falls back to description (English) when null/empty.';
