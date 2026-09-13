// Entry point for the customer-facing menu app.
//
// Fully static at runtime: reads menu.json + theme.json (both generated at
// build time by scripts/generate-static.js from the shared Supabase
// project, scoped to THIS client's restaurant slug in client.config.json).
// No login, no live database calls, no API — just static files.
//
// Screens:
//   1. Menu Home    — logo, language switch, categories, dish cards
//   2. Dish Details — photo, description, spicy badge, quantity, Add to List
//   3. My List      — selections overlay, backed by browser localStorage only

import { applyTheme } from "./theme.js";
import { initLanguage, t } from "./i18n/index.js";
import { renderMenuHome, updateMyListBadge } from "./pages/menuHome.js";
import { renderDishDetail } from "./pages/dishDetail.js";
import { renderMyList } from "./pages/myListView.js";

const app = document.getElementById("app");

async function start() {
  // Establish a language before anything else can fail, so t() is always
  // safe to call — including in the error paths below.
  initLanguage();

  try {
    await applyTheme();
  } catch (err) {
    // Falls back to the default colors already defined in styles.css —
    // a missing/broken theme.json shouldn't block the whole menu.
    console.error("Failed to load theme.json — using default theme.", err);
  }

  let menu;
  try {
    const res = await fetch("/menu.json");
    if (!res.ok) throw new Error(`menu.json request failed with status ${res.status}`);
    menu = await res.json();
  } catch (err) {
    // Covers a real 404, and also a dev-server SPA fallback that returns
    // index.html with a 200 status — res.json() throws on that too.
    console.error("Failed to load menu.json:", err);
    app.innerHTML = `<p class="load-error">${t("load.error")}</p>`;
    return;
  }

  initLanguage(menu.restaurant.languageDefault);
  showMenuHome(menu);
}

function showMenuHome(menu) {
  renderMenuHome(app, {
    menu,
    onOpenItem: (item, { quickAdd }) => {
      if (quickAdd) {
        // Quick-add from the card: renderDishDetail adds directly and
        // returns immediately (see dishDetail.js), so just refresh the badge.
        renderDishDetail(app, {
          item,
          quickAdd: true,
          onAdded: () => updateMyListBadge(app),
        });
      } else {
        showDishDetail(menu, item);
      }
    },
    onOpenMyList: () => showMyList(menu),
  });
}

function showDishDetail(menu, item, { quantity = 1, selectedOptions = {}, editingLineId = null } = {}) {
  renderDishDetail(app, {
    item,
    quickAdd: false,
    initialQuantity: quantity,
    initialOptions: selectedOptions,
    editingLineId,
    onBack: () => showMenuHome(menu),
    onAdded: () => showMenuHome(menu),
  });
}

function showMyList(menu) {
  renderMyList(document.body, {
    onClose: () => {
      document.querySelector(".my-list-overlay")?.remove();
      updateMyListBadge(app);
    },
    onEditItem: (row) => {
      document.querySelector(".my-list-overlay")?.remove();
      const item = menu.items.find((i) => i.id === row.id);
      // Re-opens at this row's current quantity and option choices, rather
      // than resetting — editing a Latte with Oat Milk should show Oat
      // Milk already selected, not a blank picker. editingLineId tells
      // dishDetail.js to replace this exact row rather than adding on top
      // of it (addItem() otherwise merges into any matching row).
      showDishDetail(menu, item, {
        quantity: row.quantity,
        selectedOptions: row.selectedOptions,
        editingLineId: row.lineId,
      });
    },
  });
}

start();
