// Settings — per-restaurant details an admin can manage directly, instead
// of needing the template owner to run SQL: display name, logo, site URL
// + QR code, customer-site theme colors, featured item, and the deploy
// webhook Publish Changes calls (see supabase/migrations for the
// deploy_webhook_url column). The admin panel's own UI language is a
// separate concern, controlled by the sidebar toggle (see ../i18n).

import QRCode from "qrcode";
import { cropImage } from "../components/cropModal.js";
import { confirmModal } from "../components/confirmModal.js";
import { promptModal } from "../components/promptModal.js";
import { showToast } from "../components/toast.js";
import { t, getLanguage, setLanguage } from "../i18n/index.js";

const THEME_FIELDS = [
  { key: "background", labelKey: "settings.themeBackground" },
  { key: "surface", labelKey: "settings.themeSurface" },
  { key: "surfaceCard", labelKey: "settings.themeSurfaceCard" },
  { key: "textOnDark", labelKey: "settings.themeTextOnDark" },
  { key: "nameColor", labelKey: "settings.themeNameColor" },
  { key: "sectionHeader", labelKey: "settings.themeSectionHeader" },
  { key: "priceColor", labelKey: "settings.themePriceColor" },
  { key: "accent", labelKey: "settings.themeAccent" },
  { key: "danger", labelKey: "settings.themeDanger" },
  { key: "featuredBg", labelKey: "settings.themeFeaturedBg" },
];
const THEME_FALLBACK = "#808080";

function featuredSummary(items, selectedIds) {
  if (selectedIds.length === 0) return "None (auto-pick)";
  const names = selectedIds.map((id) => items.find((i) => i.id === id)?.name).filter(Boolean);
  if (names.length > 2) return `${names.length} items selected`;
  return names.join(", ");
}

export async function renderSettings(container, { supabase, session, onSignOut, onNavItems }) {
  container.innerHTML = `<div class="workspace-loading">Loading settings…</div>`;

  const { data: memberships, error: membershipError } = await supabase
    .from("restaurant_admins")
    .select(
      "restaurant_id, role, restaurants(id, name, slug, logo_url, deploy_webhook_url, site_url, theme, featured_item_ids)"
    )
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

  const restaurants = (memberships || []).map((m) => m.restaurants).filter(Boolean);

  if (restaurants.length === 0) {
    renderDeadEnd("No restaurant is linked to this account yet. Ask the template owner to add you as an admin.");
    return;
  }

  const state = { restaurantId: restaurants[0].id };
  let logoFile = null;
  let logoRemoved = false;
  let logoPreviewUrl = "";

  async function load() {
    const restaurant = restaurants.find((r) => r.id === state.restaurantId);
    const [
      { data: categories, error: categoriesError },
      { data: items, error: itemsError },
    ] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, name_ar, sort_order, is_available")
        .eq("restaurant_id", state.restaurantId)
        .order("sort_order"),
      supabase
        .from("items")
        .select("id, name")
        .eq("restaurant_id", state.restaurantId)
        .order("sort_order"),
    ]);

    if (categoriesError || itemsError) {
      console.error("Failed to load settings data:", categoriesError || itemsError);
      showToast("Couldn't load some settings data. Try refreshing the page.", { type: "error", duration: 4000 });
    }

    render(restaurant, categories || [], items || []);
  }

  function render(restaurant, categories, items) {
    logoFile = null;
    logoRemoved = false;
    logoPreviewUrl = restaurant.logo_url || "";

    container.innerHTML = `
      <div class="admin-shell">
        <aside class="admin-sidebar">
          <div class="sidebar-brand">
            <span class="login-logo-mark" aria-hidden="true"></span>
            <span>ScanMenu <strong>Admin</strong></span>
          </div>
          ${restaurant.logo_url ? `<div class="sidebar-restaurant-logo"><img src="${restaurant.logo_url}" alt="${restaurant.name}" /></div>` : ""}
          ${restaurant.site_url ? `<a class="sidebar-site-link" href="${restaurant.site_url}" target="_blank" rel="noopener">↗ View site</a>` : ""}
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
            <a class="admin-nav-item" href="#" id="nav-items">${t("sidebar.menuItems")}</a>
            <a class="admin-nav-item active" href="#">${t("sidebar.settings")}</a>
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
          <div class="settings-header">
            <h1 class="settings-heading">${t("settings.heading")}</h1>
            <button class="publish-button" id="publish">${t("menuItems.publish")}</button>
          </div>

          <div class="publish-status" id="publish-status" hidden></div>

          <div class="settings-grid">
          <div class="settings-panel">
            <div class="field" id="logo-field"></div>

            <div class="field">
              <label for="restaurant-name">${t("settings.restaurantName")}</label>
              <input type="text" id="restaurant-name" value="${restaurant.name}" required />
            </div>

            <div class="field">
              <label for="site-url">Site URL</label>
              <input
                type="url"
                id="site-url"
                placeholder="https://chino-cafe.vercel.app"
                value="${restaurant.site_url || ""}"
              />
              <p class="field-hint">Your live customer-facing site's URL. Powers the "View site" link above and the QR code below.</p>
            </div>

            <div class="field">
              <label>Featured items</label>
              ${
                items.length === 0
                  ? `<p class="field-hint">Add a menu item first, then feature it here.</p>`
                  : `
                <details class="category-dropdown" id="featured-item-dropdown">
                  <summary class="category-dropdown-toggle">
                    <span id="featured-item-summary">${featuredSummary(items, restaurant.featured_item_ids || [])}</span>
                    <span class="dropdown-chevron">⌄</span>
                  </summary>
                  <div class="category-dropdown-menu featured-item-menu">
                    ${items
                      .map(
                        (i) => `
                      <label class="featured-item-option">
                        <input type="checkbox" class="featured-item-checkbox" value="${i.id}" ${
                          (restaurant.featured_item_ids || []).includes(i.id) ? "checked" : ""
                        } />
                        ${i.name}
                      </label>
                    `
                      )
                      .join("")}
                  </div>
                </details>
              `
              }
              <p class="field-hint">Shown in the "See what's inside" section on your customer site's home screen. Leave all unchecked to auto-pick one.</p>
            </div>

            <div class="field">
              <label for="deploy-webhook">${t("settings.deployWebhook")}</label>
              <input
                type="url"
                id="deploy-webhook"
                placeholder="https://api.vercel.com/v1/integrations/deploy/..."
                value="${restaurant.deploy_webhook_url || ""}"
              />
              <p class="field-hint">${t("settings.deployHint")}</p>
            </div>

            <div class="settings-status" id="settings-status" hidden></div>

            <button class="primary-button" id="save-settings">${t("settings.save")}</button>
          </div>

          <div class="settings-panel">
            <h2 class="settings-subheading">${t("settings.themeHeading")}</h2>
            <p class="field-hint">${t("settings.themeHint")}</p>

            <div class="theme-field-grid">
              ${THEME_FIELDS.map(
                (field) => `
                <div class="theme-field">
                  <label for="theme-${field.key}">${t(field.labelKey)}</label>
                  <input
                    type="color"
                    id="theme-${field.key}"
                    value="${restaurant.theme?.[field.key] || THEME_FALLBACK}"
                    data-touched="${restaurant.theme?.[field.key] ? "true" : "false"}"
                  />
                </div>
              `
              ).join("")}
            </div>

            <div class="settings-status" id="theme-status" hidden></div>

            <button class="primary-button" id="save-theme">${t("settings.saveTheme")}</button>
          </div>

          <div class="settings-panel">
            <h2 class="settings-subheading">QR code</h2>
            ${
              restaurant.site_url
                ? `
              <div class="qr-code-panel">
                <canvas id="qr-canvas"></canvas>
                <button class="secondary-button" id="print-qr">Print QR Code</button>
              </div>
            `
                : `<p class="field-hint">Set your Site URL above first, then a QR code pointing at it will appear here.</p>`
            }
          </div>

          <div class="settings-panel">
            <h2 class="settings-subheading">${t("settings.categoriesHeading")}</h2>
            <p class="field-hint">${t("settings.categoriesHint")}</p>

            <div class="category-translate-list">
              ${categories
                .map(
                  (c) => `
                <div class="category-translate-row" data-id="${c.id}">
                  <input type="text" class="category-name-en" value="${c.name}" placeholder="${t("settings.categoryNameEn")}" />
                  <input type="text" class="category-name-ar" dir="rtl" value="${c.name_ar ?? ""}" placeholder="${t("settings.categoryNameAr")}" />
                  <label class="toggle-switch category-available-toggle" title="Shown on customer site">
                    <input type="checkbox" class="category-available" ${c.is_available !== false ? "checked" : ""} />
                    <span class="toggle-track"></span>
                  </label>
                </div>
              `
                )
                .join("") || `<p class="field-hint">${t("settings.noCategories")}</p>`}
            </div>

            <div class="settings-status" id="categories-status" hidden></div>

            <div class="settings-panel-actions">
              <button class="secondary-button" id="add-category">${t("menuItems.addCategory")}</button>
              ${categories.length > 0 ? `<button class="primary-button" id="save-categories">Save Categories</button>` : ""}
            </div>
          </div>
          </div>
        </main>
      </div>
    `;

    renderLogoField();
    renderQrCode(restaurant);

    // A color input always has a value — it can't represent "not set" — so
    // track which swatches the admin actually touched. saveTheme() below
    // only writes touched fields, leaving the rest as whatever they already
    // were (unset = template default), matching the hint text above.
    THEME_FIELDS.forEach((field) => {
      container.querySelector(`#theme-${field.key}`).addEventListener("input", (e) => {
        e.target.dataset.touched = "true";
      });
    });

    container.querySelectorAll(".featured-item-checkbox").forEach((box) => {
      box.addEventListener("change", () => {
        const selectedIds = [...container.querySelectorAll(".featured-item-checkbox:checked")].map((el) => el.value);
        container.querySelector("#featured-item-summary").textContent = featuredSummary(items, selectedIds);
      });
    });

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

    container.querySelector("#save-categories")?.addEventListener("click", async () => {
      const saveBtn = container.querySelector("#save-categories");
      const statusBox = container.querySelector("#categories-status");
      const rows = [...container.querySelectorAll(".category-translate-row")].map((row) => ({
        id: row.dataset.id,
        name: row.querySelector(".category-name-en").value.trim(),
        nameAr: row.querySelector(".category-name-ar").value.trim(),
        isAvailable: row.querySelector(".category-available").checked,
      }));

      const invalidRow = rows.find((r) => !r.name || !r.nameAr);
      if (invalidRow) {
        statusBox.hidden = false;
        statusBox.className = "settings-status settings-status-error";
        statusBox.textContent = "Every category needs both an English and Arabic name.";
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = "Saving…";

      const results = await Promise.all(
        rows.map((r) =>
          supabase
            .from("categories")
            .update({ name: r.name, name_ar: r.nameAr, is_available: r.isAvailable })
            .eq("id", r.id)
        )
      );

      saveBtn.disabled = false;
      saveBtn.textContent = "Save Categories";

      const failed = results.some((r) => r.error);
      statusBox.hidden = false;
      if (failed) {
        statusBox.className = "settings-status settings-status-error";
        statusBox.textContent = "Couldn't save one or more categories. Try again.";
        return;
      }

      rows.forEach((r) => {
        const category = categories.find((c) => c.id === r.id);
        if (category) Object.assign(category, { name: r.name, name_ar: r.nameAr, is_available: r.isAvailable });
      });
      statusBox.className = "settings-status settings-status-success";
      statusBox.textContent = "Categories saved.";
    });

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
      showToast("Category added.", { type: "success" });
      load();
    });

    container.querySelector("#nav-items").addEventListener("click", onNavItems);

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

    container.querySelector("#save-settings").addEventListener("click", () => save(restaurant));
    container.querySelector("#save-theme").addEventListener("click", () => saveTheme(restaurant));
    container.querySelector("#publish").addEventListener("click", () => publish(restaurant));
  }

  function renderLogoField() {
    const field = container.querySelector("#logo-field");
    field.innerHTML = `
      <label>${t("settings.logo")}</label>
      <div class="logo-field-row">
        <div class="logo-preview" id="logo-preview">
          ${logoPreviewUrl ? `<img src="${logoPreviewUrl}" alt="" />` : `<span>${t("settings.noLogo")}</span>`}
        </div>
        <div class="logo-field-actions">
          <label class="secondary-button logo-upload-button">
            ${t("settings.changeLogo")}
            <input type="file" accept="image/*" id="logo-input" hidden />
          </label>
          ${logoPreviewUrl ? `<button type="button" class="link-button" id="remove-logo">${t("settings.removeLogo")}</button>` : ""}
        </div>
      </div>
    `;

    field.querySelector("#logo-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      // Logos are rendered at a fixed height with natural width (see
      // apps/customer/src/styles.css .menu-logo) — no fixed aspect ratio
      // to lock to, so this crop step is a free-form frame/trim only.
      const cropped = await cropImage(file, { aspectRatio: NaN });
      if (!cropped) return;
      logoFile = cropped;
      logoRemoved = false;
      logoPreviewUrl = URL.createObjectURL(cropped);
      renderLogoField();
    });

    const removeBtn = field.querySelector("#remove-logo");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        logoFile = null;
        logoRemoved = true;
        logoPreviewUrl = "";
        renderLogoField();
      });
    }
  }

  function renderQrCode(restaurant) {
    if (!restaurant.site_url) return;
    const canvas = container.querySelector("#qr-canvas");
    QRCode.toCanvas(canvas, restaurant.site_url, { width: 220, margin: 2 }, (err) => {
      if (err) console.error("Failed to render QR code:", err);
    });

    container.querySelector("#print-qr").addEventListener("click", () => {
      const dataUrl = canvas.toDataURL("image/png");
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
          <head><title>${restaurant.name} — QR Code</title></head>
          <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
            <img src="${dataUrl}" alt="QR code" style="width:320px;height:320px;" />
            <p style="margin-top:16px;font-size:18px;">${restaurant.name}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    });
  }

  async function save(restaurant) {
    const saveBtn = container.querySelector("#save-settings");
    const statusBox = container.querySelector("#settings-status");
    const name = container.querySelector("#restaurant-name").value.trim();
    const siteUrl = container.querySelector("#site-url").value.trim();
    const featuredItemIds = [...container.querySelectorAll(".featured-item-checkbox:checked")].map((el) => el.value);
    const deployWebhookUrl = container.querySelector("#deploy-webhook").value.trim();

    if (!name) {
      statusBox.hidden = false;
      statusBox.className = "settings-status settings-status-error";
      statusBox.textContent = "Restaurant name can't be empty.";
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    let logoUrl = restaurant.logo_url ?? null;

    if (logoFile) {
      const path = `${restaurant.slug}/logo-${Date.now()}-${logoFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("dish-photos")
        .upload(path, logoFile, { upsert: true });

      if (uploadError) {
        statusBox.hidden = false;
        statusBox.className = "settings-status settings-status-error";
        statusBox.textContent = "Couldn't upload that logo. Try a different file.";
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Settings";
        return;
      }

      logoUrl = supabase.storage.from("dish-photos").getPublicUrl(path).data.publicUrl;
    } else if (logoRemoved) {
      logoUrl = null;
    }

    const updates = {
      name,
      logo_url: logoUrl,
      site_url: siteUrl || null,
      featured_item_ids: featuredItemIds,
      deploy_webhook_url: deployWebhookUrl || null,
    };

    const { error } = await supabase.from("restaurants").update(updates).eq("id", restaurant.id);

    saveBtn.disabled = false;
    saveBtn.textContent = "Save Settings";

    if (error) {
      statusBox.hidden = false;
      statusBox.className = "settings-status settings-status-error";
      statusBox.textContent = "Couldn't save settings. Try again.";
      return;
    }

    Object.assign(restaurant, updates);

    // Re-render so the sidebar logo, restaurant-switcher label, and every
    // other field reflect what was just saved, then show the success
    // message on the freshly-rendered status box (render() starts it hidden).
    await load();
    const freshStatusBox = container.querySelector("#settings-status");
    freshStatusBox.hidden = false;
    freshStatusBox.className = "settings-status settings-status-success";
    freshStatusBox.textContent = "Settings saved.";
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

  async function saveTheme(restaurant) {
    const saveBtn = container.querySelector("#save-theme");
    const statusBox = container.querySelector("#theme-status");

    const theme = { ...(restaurant.theme || {}) };
    THEME_FIELDS.forEach((field) => {
      const input = container.querySelector(`#theme-${field.key}`);
      if (input.dataset.touched === "true") theme[field.key] = input.value;
    });

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    const { error } = await supabase.from("restaurants").update({ theme }).eq("id", restaurant.id);

    saveBtn.disabled = false;
    saveBtn.textContent = "Save Theme";

    statusBox.hidden = false;
    if (error) {
      statusBox.className = "settings-status settings-status-error";
      statusBox.textContent = "Couldn't save theme. Try again.";
      return;
    }

    restaurant.theme = theme;
    statusBox.className = "settings-status settings-status-success";
    statusBox.textContent = "Theme saved. Publish Changes to make it live.";
  }

  load();
}
