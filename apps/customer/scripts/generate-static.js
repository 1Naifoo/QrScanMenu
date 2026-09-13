// Build step for ONE client's customer-facing site.
//
// Every client gets their own copy of this whole apps/customer folder as
// its own repo (same code, different client.config.json), but all of them
// read from the SAME shared Supabase project — this script is what scopes
// that shared database down to just this restaurant's data at build time.
//
// Uses the SERVICE ROLE key (CI/build secret only — see .env.example in
// this folder). Never runs in a browser, never committed with a real key.
//
// Run via: npm run build:data  (see package.json)
// Typically wired into your host's build command, e.g.:
//   "buildCommand": "npm run build:data && npm run build"

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const clientConfig = JSON.parse(
  readFileSync(path.join(rootDir, "client.config.json"), "utf-8")
);

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set these as build-time secrets (never commit them) — see .env.example."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  const slug = clientConfig.restaurantSlug;

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url, language_default, theme, featured_item_ids")
    .eq("slug", slug)
    .single();

  if (restaurantError || !restaurant) {
    console.error(`No restaurant found for slug "${slug}". Check client.config.json.`);
    process.exit(1);
  }

  const [{ data: categories, error: categoriesError }, { data: items, error: itemsError }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name, name_ar, sort_order, is_available")
        .eq("restaurant_id", restaurant.id)
        .order("sort_order"),
      supabase
        .from("items")
        .select("id, category_id, name, name_ar, description, description_ar, ingredients, options, price, is_spicy, is_available, photo_url, sort_order, featured_caption, featured_caption_ar")
        .eq("restaurant_id", restaurant.id)
        .order("sort_order"),
    ]);

  if (categoriesError || itemsError) {
    console.error("Failed to fetch categories or items:", categoriesError || itemsError);
    process.exit(1);
  }

  const menu = {
    restaurant: {
      name: restaurant.name,
      slug: restaurant.slug,
      logoUrl: restaurant.logo_url,
      languageDefault: restaurant.language_default,
      featuredItemIds: restaurant.featured_item_ids || [],
    },
    categories: categories || [],
    items: items || [],
    generatedAt: new Date().toISOString(),
  };

  // DB-stored theme values (set via admin Settings) override the file's
  // defaults per-key — an admin who hasn't customized anything yet still
  // gets client.config.json's original colors untouched.
  const theme = { ...clientConfig.theme, ...(restaurant.theme || {}) };

  const publicDir = path.join(rootDir, "public");
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(path.join(publicDir, "menu.json"), JSON.stringify(menu, null, 2));
  writeFileSync(path.join(publicDir, "theme.json"), JSON.stringify(theme, null, 2));

  console.log(`Generated public/menu.json and public/theme.json for "${restaurant.name}".`);
  console.log(`  ${(items || []).length} items across ${(categories || []).length} categories.`);
}

main().catch((err) => {
  console.error("generate-static.js failed:", err);
  process.exit(1);
});
