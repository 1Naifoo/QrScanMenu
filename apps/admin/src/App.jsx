// React app shell — owns which screen is mounted (Login / Menu Items /
// Settings) and the session, but deliberately does NOT reimplement any of
// those screens in JSX. Each one is still the exact same DOM-rendering
// function it always was (see ./pages) — this component just decides which
// one gets to render into the container div, the same way main.js's
// show*() functions used to. Zero behavior/design change, only how the
// screens get mounted.

import { useCallback, useEffect, useRef, useState } from "react";
import { renderLogin } from "./pages/login.js";
import { renderMenuItems } from "./pages/menuItems.js";
import { renderEditItem } from "./pages/editItem.js";
import { renderSettings } from "./pages/settings.js";

export default function App({ supabase }) {
  const containerRef = useRef(null);
  // null while the initial supabase.auth.getSession() check is in flight —
  // nothing renders yet, same as the original start()'s await gap.
  const [view, setView] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        setSession(data.session);
        setView("menuItems");
      } else {
        setView("login");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) {
        setSession(null);
        setView("login");
      }
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const onSignedIn = useCallback((newSession) => {
    setSession(newSession);
    setView("menuItems");
  }, []);

  const onSignOut = useCallback(() => {
    setSession(null);
    setView("login");
  }, []);

  // Edit Item is its own overlay appended straight to <body>, entirely
  // outside this component's tree — exactly as it was before, just called
  // from here instead of from main.js.
  const onEditItem = useCallback(
    ({ restaurant, categories, item, onDone }) => {
      renderEditItem(document.body, {
        supabase,
        restaurant,
        categories,
        item,
        onDone,
        onClose: () => {},
      });
    },
    [supabase]
  );

  useEffect(() => {
    if (!containerRef.current || view === null) return;

    if (view === "login") {
      renderLogin(containerRef.current, { supabase, onSignedIn });
    } else if (view === "menuItems" && session) {
      renderMenuItems(containerRef.current, {
        supabase,
        session,
        onEditItem,
        onSignOut,
        onNavSettings: () => setView("settings"),
      });
    } else if (view === "settings" && session) {
      renderSettings(containerRef.current, {
        supabase,
        session,
        onSignOut,
        onNavItems: () => setView("menuItems"),
      });
    }
  }, [view, session, supabase, onSignedIn, onSignOut, onEditItem]);

  const shellClass = view === "menuItems" || view === "settings" ? "app-shell-wide" : "app-shell-centered";

  return <div ref={containerRef} className={shellClass} />;
}
