-- Adds a per-restaurant deploy webhook URL.
--
-- Since every client gets their own duplicated repo/site (same code,
-- different branding and menu data) but all share this one database,
-- there needs to be a way for the admin panel's "Publish Changes" button
-- to trigger the rebuild of just that one client's site. Each client's
-- hosting provider (Vercel/Netlify deploy hook, or a GitHub Actions
-- repository_dispatch URL) issues a webhook URL for exactly this purpose.

alter table restaurants
  add column if not exists deploy_webhook_url text;

comment on column restaurants.deploy_webhook_url is
  'Webhook URL that triggers this restaurant''s own static site to rebuild and redeploy (e.g. a Vercel/Netlify deploy hook). Called by the admin panel''s Publish Changes action. Safe to store as a plain URL: these hooks are designed to be triggered without further secrets, but treat it as sensitive-ish (do not publish it publicly) since anyone with the URL can trigger a rebuild.';
