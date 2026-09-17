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
//
// React only owns the app shell (see App.jsx) — which screen is mounted
// and the session. Each screen itself is still rendered by the same
// plain-DOM functions as before.

import { createRoot } from "react-dom/client";
import { createBrowserClient } from "@scanmenu/shared";
import App from "./App.jsx";

const supabase = createBrowserClient({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

createRoot(document.getElementById("app")).render(<App supabase={supabase} />);
