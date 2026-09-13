// Entry point for the login-protected admin panel.
//
// This app talks to Supabase directly using the public anon key + Row
// Level Security (see supabase/migrations for the policies that restrict
// writes to authenticated admins only). It never uses the service-role key.
//
// Screens (see project documentation, Section 5):
//   1. Login       — email/password sign-in, no public sign-up
//   2. Menu Items  — restaurant switcher, search/filter, item table, Publish
//   3. Edit Item   — photo, name, category, description, price, spicy toggle
//
// Responsive by design: same screens/data at desktop (1440px) and mobile
// (390px) breakpoints — see styles.css for the layout switch.

import { createBrowserClient } from "@scanmenu/shared";
import { renderLogin } from "./pages/login.js";
import { renderMenuItems } from "./pages/menuItems.js";
import { renderEditItem } from "./pages/editItem.js";
import { renderSettings } from "./pages/settings.js";

const supabase = createBrowserClient({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

const app = document.getElementById("app");

function showMenuItems(session) {
  app.className = "app-shell-wide";
  renderMenuItems(app, {
    supabase,
    session,
    onSignOut: showLogin,
    onNavSettings: () => showSettings(session),
    onEditItem: ({ restaurant, categories, item, onDone }) => {
      renderEditItem(document.body, {
        supabase,
        restaurant,
        categories,
        item,
        onDone,
        onClose: () => {},
      });
    },
  });
}

function showSettings(session) {
  app.className = "app-shell-wide";
  renderSettings(app, {
    supabase,
    session,
    onSignOut: showLogin,
    onNavItems: () => showMenuItems(session),
  });
}

function showLogin() {
  app.className = "app-shell-centered";
  renderLogin(app, { supabase, onSignedIn: showMenuItems });
}

async function start() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    showMenuItems(data.session);
  } else {
    showLogin();
  }
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session) showLogin();
});

start();
