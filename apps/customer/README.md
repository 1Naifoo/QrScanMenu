# ScanMenu — Customer Template

This folder is a **template**. Every client gets their own copy of it as
their own standalone repo — same code, different `client.config.json`.
All copies read from the **same shared Supabase project** (the one this
monorepo's admin panel and database migrations set up); only the
restaurant `slug` in `client.config.json` decides which client's data a
given copy displays.

## Duplicating this for a new client

1. Copy this whole `apps/customer` folder out into a new, separate Git
   repository (e.g. `scanmenu-olive-garden`).
2. In the new repo's `client.config.json`, set:
   - `restaurantSlug` — must match the `slug` column of that client's row
     in the shared `restaurants` table (create the row first if it
     doesn't exist yet — see the root project's `supabase/seed.sql` for
     an example).
   - `theme` — that client's brand colors and fonts.
3. Set the two build-time secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
   in your hosting provider's environment variables — **never commit
   these**. See `.env.example`.
4. Set the build command on your host to `npm run build` (this runs
   `scripts/generate-static.js` first, then the Vite build — see
   `package.json`).
5. Deploy. Point that client's QR code at this site's URL.

## Why a service-role key in every client's repo isn't a bigger risk

Each copy only ever queries for the ONE restaurant matching its own
`restaurantSlug` — see `scripts/generate-static.js`. The key itself
technically has full database access, so:

- Keep each client repo **private**.
- Store the key only as a build-time secret in your host (Vercel/Netlify/
  GitHub Actions), never in a committed `.env` file.
- If a key ever leaks, rotate it in the Supabase dashboard — this
  invalidates it for every client repo using it, so you'd need to update
  the secret everywhere afterwards.

## Publishing changes made in the admin panel

The admin panel (a separate app, in this monorepo's `apps/admin`) writes
menu edits to Supabase — but that alone doesn't rebuild any client's
static site. Two ways to trigger a rebuild:

- **Deploy hook (recommended)** — most hosts (Vercel, Netlify) can
  generate a webhook URL that rebuilds the site when called. Store that
  URL in the `deploy_webhook_url` column on that client's row in the
  `restaurants` table; the admin panel's "Publish Changes" button calls
  it automatically.
- **Manual redeploy** — without a deploy hook set, changes are saved in
  the database but the live site won't reflect them until the next
  manual rebuild/redeploy.

## Local development

From the monorepo root:

```bash
npm install
cp apps/customer/.env.example apps/customer/.env   # fill in real values
npm run build --workspace=apps/customer            # generates menu.json + theme.json, then builds
npm run dev:customer                                # or just run the dev server directly
```
