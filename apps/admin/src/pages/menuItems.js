// Menu Items — the main admin workspace.
//
// Desktop: sidebar (restaurant switcher + nav) beside a table.
// Mobile: top bar + stacked card rows, Add Item becomes a floating button.
// Both sizes share this same markup; styles.css handles the layout switch
// at the breakpoint, per the responsive approach in the design notes.

import { promptModal } from "../components/promptModal.js";
import { confirmModal } from "../components/confirmModal.js";
import { showToast } from "../components/toast.js";
import { RIYAL_ICON_SVG } from "@scanmenu/shared";
import { t, getLanguage, setLanguage } from "../i18n/index.js";

export async function renderMenuItems(container, { supabase, session, onEditItem, onSignOut, onNavSettings }) {
  container.innerHTML = `<div class="workspace-loading">Loading your restaurants…</div>`;

  const { data: memberships, error: membershipError } = await supabase
    .from("restaurant_admins")
    .select("restaurant_id, role, restaurants(id, name, slug, logo_url, deploy_webhook_url)")
    .eq("user_id", session.user.id);

  function renderDeadEnd(message) {
    container.innerHTML = `
      <div class="workspace-loading">
        <p>${message}</p>
        <button id="dead-end-sign-out" class="link-button">${t("sidebar.signOut")}</button>
      </div>
    `;
    container.querySelector("#dead-end-sign-out").addEventListener("click", async () => {
      const confirmed = await confirmModal({
        title: "Sign out",
        message: "Are you sure you want to sign out?",
        confirmText: "Sign Out",
      });
      if (!confirmed) return;
      await supabase.auth.signOut();
      onSignOut();
    });
  }

  if (membershipError) {
    renderDeadEnd("Couldn't load your restaurants. Try refreshing.");
    return;
  }

  const restaurants = (memberships || [])
    .map((m) => m.restaurants)
    .filter(Boolean);

  if (restaurants.length === 0) {
    renderDeadEnd("No restaurant is linked to this account yet. Ask the template owner to add you as an admin.");
    return;
  }

  const state = {
    restaurantId: restaurants[0].id,
    search: "",
    categoryFilter: "all",
  };

  async function load() {
    const restaurant = restaurants.find((r) => r.id === state.restaurantId);

    const [
      { data: categories, error: categoriesError },
      { data: items, error: itemsError },
    ] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", state.restaurantId)
        .order("sort_order"),
      supabase
        .from("items")
        .select("id, name, name_ar, category_id, price, is_spicy, is_available, photo_url, description, description_ar, ingredients, options, sort_order")
        .eq("restaurant_id", state.restaurantId)
        .order("sort_order"),
    ]);

    if (categoriesError || itemsError) {
      console.error("Failed to load categories/items:", categoriesError || itemsError);
      showToast("Couldn't load your menu. Try refreshing the page.", { type: "error", duration: 4000 });
    }

    render(restaurant, categories || [], items || []);
  }

  function render(restaurant, categories, items) {
    const categoryById = Object.fromEntries(categories.map((c) => [c.id, c.name]));

    const filteredItems = items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(state.search.toLowerCase());
      const matchesCategory =
        state.categoryFilter === "all" || item.category_id === state.categoryFilter;
      return matchesSearch && matchesCategory;
    });

    container.innerHTML = `
      <div class="admin-shell">
        <aside class="admin-sidebar">
          <div class="sidebar-brand">
            <span class="login-logo-mark" aria-hidden="true"></span>
            <span>ScanMenu <strong>Admin</strong></span>
          </div>
          ${restaurant.logo_url ? `<div class="sidebar-restaurant-logo"><img src="${restaurant.logo_url}" alt="${restaurant.name}" /></div>` : ""}
          <div class="restaurant-switcher">
            <label for="restaurant-select">${t("sidebar.restaurant")}</label>
            <select id="restaurant-select">
              ${restaurants
                .map(
                  (r) =>
                    `<option value="${r.id}" ${r.id === state.restaurantId ? "selected" : ""}>${r.name}</option>`
                )
                .join("")}
            </select>
          </div>
          <nav class="admin-nav">
            <a class="admin-nav-item active" href="#">${t("sidebar.menuItems")}</a>
            <a class="admin-nav-item" href="#" id="nav-settings">${t("sidebar.settings")}</a>
          </nav>
          <div class="sidebar-lang-switch">
            <button class="lang-option ${getLanguage() === "en" ? "active" : ""}" data-lang="en">English</button>
            <button class="lang-option ${getLanguage() === "ar" ? "active" : ""}" data-lang="ar">العربية</button>
          </div>
          <div class="admin-account">
            <span class="account-avatar">${session.user.email.charAt(0).toUpperCase()}</span>
            <span class="account-email">${session.user.email}</span>
            <button id="sign-out" class="link-button">${t("sidebar.signOut")}</button>
          </div>
        </aside>

        <main class="admin-main">
          <div class="admin-topbar">
            <input type="search" id="search-input" placeholder="${t("menuItems.searchPlaceholder")}" value="${state.search}" />
            <details class="category-dropdown" id="category-dropdown">
              <summary class="category-dropdown-toggle">
                <span>${state.categoryFilter === "all" ? t("menuItems.allCategories") : categoryById[state.categoryFilter] || t("menuItems.allCategories")}</span>
                <span class="dropdown-chevron">⌄</span>
              </summary>
              <div class="category-dropdown-menu">
                <button type="button" class="category-dropdown-option ${state.categoryFilter === "all" ? "selected" : ""}" data-category="all">${t("menuItems.allCategories")}</button>
                ${categories
                  .map(
                    (c) =>
                      `<button type="button" class="category-dropdown-option ${c.id === state.categoryFilter ? "selected" : ""}" data-category="${c.id}">${c.name}</button>`
                  )
                  .join("")}
              </div>
            </details>
            <button id="add-category" class="secondary-button">${t("menuItems.addCategory")}</button>
            <button id="add-item" class="primary-button">${t("menuItems.addItem")}</button>
            <button id="publish" class="publish-button">${t("menuItems.publish")}</button>
          </div>

          <div class="category-pills">
            <button class="category-pill ${state.categoryFilter === "all" ? "active" : ""}" data-category="all">All</button>
            ${categories
              .map(
                (c) =>
                  `<button class="category-pill ${c.id === state.categoryFilter ? "active" : ""}" data-category="${c.id}">${c.name}</button>`
              )
              .join("")}
          </div>

          <div id="publish-status" class="publish-status" hidden></div>

          <table class="items-table">
            <thead>
              <tr>
                <th></th>
                <th>${t("menuItems.colName")}</th>
                <th>${t("menuItems.colCategory")}</th>
                <th>${t("menuItems.colPrice")}</th>
                <th>${t("menuItems.colSpicy")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${filteredItems
                .map(
                  (item) => `
                <tr data-item-id="${item.id}">
                  <td class="item-thumb">
                    ${item.photo_url ? `<img src="${item.photo_url}" alt="" />` : `<div class="thumb-placeholder"></div>`}
                  </td>
                  <td>${item.name}${item.is_available ? "" : ` <span class="badge-unavailable">${t("menuItems.unavailable")}</span>`}</td>
                  <td>${categoryById[item.category_id] || "—"}</td>
                  <td class="price-cell">${RIYAL_ICON_SVG} ${Number(item.price).toFixed(2)}</td>
                  <td>${item.is_spicy ? "🌶️" : ""}</td>
                  <td class="item-row-actions">
                    <button class="icon-button edit-item" title="${t("menuItems.editTitle")}">✎</button>
                    <button class="icon-button delete-item" title="${t("menuItems.deleteTitle")}">🗑</button>
                  </td>
                </tr>
              `
                )
                .join("") || `<tr><td colspan="6" class="empty-row">${t("menuItems.empty")}</td></tr>`}
            </tbody>
          </table>

          <button id="add-item-fab" class="fab" aria-label="Add Item">+</button>
        </main>
      </div>
    `;

    container.querySelector("#restaurant-select").addEventListener("change", (e) => {
      state.restaurantId = e.target.value;
      load();
    });

    container.querySelectorAll(".sidebar-lang-switch .lang-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.lang === getLanguage()) return;
        setLanguage(btn.dataset.lang);
        render(restaurant, categories, items);
      });
    });

    container.querySelector("#search-input").addEventListener("input", (e) => {
      state.search = e.target.value;
      const caret = e.target.selectionStart;
      render(restaurant, categories, items);
      const input = container.querySelector("#search-input");
      input.focus();
      input.setSelectionRange(caret, caret);
    });

    container.querySelectorAll(".category-dropdown-option").forEach((option) => {
      option.addEventListener("click", () => {
        state.categoryFilter = option.dataset.category;
        render(restaurant, categories, items);
      });
    });

    container.querySelectorAll(".category-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        state.categoryFilter = pill.dataset.category;
        render(restaurant, categories, items);
      });
    });

    container.querySelector("#sign-out").addEventListener("click", async () => {
      const confirmed = await confirmModal({
        title: "Sign out",
        message: "Are you sure you want to sign out?",
        confirmText: "Sign Out",
      });
      if (!confirmed) return;
      await supabase.auth.signOut();
      onSignOut();
    });

    container.querySelector("#nav-settings").addEventListener("click", onNavSettings);

    const openAddItem = () =>
      onEditItem({ restaurant, categories, item: null, onDone: load });
    container.querySelector("#add-item").addEventListener("click", openAddItem);
    container.querySelector("#add-item-fab").addEventListener("click", openAddItem);

    container.querySelector("#add-category").addEventListener("click", async () => {
      const values = await promptModal({
        title: "New Category",
        fields: [
          { id: "name", label: "Category name (English)" },
          { id: "nameAr", label: "Category name (Arabic)", dir: "rtl" },
        ],
        confirmText: "Add",
      });
      if (!values) return;
      const { error } = await supabase.from("categories").insert({
        restaurant_id: restaurant.id,
        name: values.name,
        name_ar: values.nameAr,
        sort_order: categories.length + 1,
      });
      if (error) {
        showToast("Couldn't create that category. Try again.", { type: "error" });
        return;
      }
      load();
      showToast("Category added.", { type: "success" });
    });

    container.querySelectorAll(".edit-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.target.closest("tr").dataset.itemId;
        const item = items.find((i) => i.id === id);
        onEditItem({ restaurant, categories, item, onDone: load });
      });
    });

    container.querySelectorAll(".delete-item").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.closest("tr").dataset.itemId;
        const item = items.find((i) => i.id === id);
        const confirmed = await confirmModal({
          title: "Delete item",
          message: `Delete "${item.name}"? This can't be undone.`,
          confirmText: "Delete",
          danger: true,
        });
        if (!confirmed) return;
        const { error } = await supabase.from("items").delete().eq("id", id);
        if (error) {
          showToast("Couldn't delete that item. Try again.", { type: "error" });
          return;
        }
        load();
        showToast("Item deleted.", { type: "success" });
      });
    });

    container.querySelector("#publish").addEventListener("click", async () => {
      await publish(restaurant);
    });
  }

  async function publish(restaurant) {
    const statusBox = container.querySelector("#publish-status");
    if (!restaurant.deploy_webhook_url) {
      statusBox.hidden = false;
      statusBox.textContent =
        "No deploy hook is set up for this restaurant yet — changes are saved, but the live site won't update until one is configured.";
      return;
    }

    statusBox.hidden = false;
    statusBox.textContent = "Publishing…";

    try {
      await fetch(restaurant.deploy_webhook_url, { method: "POST" });
      statusBox.textContent = "Published. The live menu will update shortly.";
    } catch {
      statusBox.textContent = "Couldn't reach the deploy hook. Check the URL and try again.";
    }
  }

  load();
}
