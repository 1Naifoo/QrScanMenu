import { createClient } from "@supabase/supabase-js";

/**
 * Client-side Supabase client — used by the admin panel in the browser.
 * Relies on the public anon key + Row Level Security policies to restrict
 * writes to authenticated admin users only. Never put the service-role
 * key here.
 */
export function createBrowserClient({ supabaseUrl, supabaseAnonKey }) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase URL or anon key. Check your .env file against .env.example."
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Server-side Supabase client — used ONLY by scripts/generate-static.js
 * during the build step. Uses the service-role key, which bypasses Row
 * Level Security, so this must never run in a browser bundle.
 */
export function createServiceRoleClient({ supabaseUrl, serviceRoleKey }) {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase URL or service role key. This client is build-time only — check your CI/build secrets."
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
