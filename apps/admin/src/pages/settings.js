// Settings — per-restaurant details an admin can manage directly, instead
// of needing the template owner to run SQL: display name, logo, and the
// deploy webhook Publish Changes calls (see supabase/migrations for the
// deploy_webhook_url column). The admin panel's own UI language is a
// separate concern, controlled by the sidebar toggle (see ../i18n).

import { cropImage } from "../components/cropModal.js";
import { confirmModal } from "../components/confirmModal.js";
import { promptModal } from "../components/promptModal.js";
import { showToast } from "../components/toast.js";
import { t, getLanguage, setLanguage } from "../i18n/index.js";

export async function renderSettings(container, { supabase, session, onSignOut, onNavItems }) {
  container.innerHTML = `<div class="workspace-loading">Loading settings…</div>`;

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
    const { data: categories, error } = await supabase
      .from("categories")
      .select("id, name, name_ar, sort_order")
      .eq("restaurant_id", state.restaurantId)
      .order("sort_order");

    if (error) {
      console.error("Failed to load categories:", error);
      showToast("Couldn't load categories. Try refreshing the page.", { type: "error", duration: 4000 });
    }

    render(restaurant, categories || []);
  }

  function render(restaurant, categories) {
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
          <div class="settings-panel">
            <h1 class="settings-heading">${t("settings.heading")}</h1>

            <div class="field" id="logo-field"></div>

            <div class="field">
              <label for="restaurant-name">${t("settings.restaurantName")}</label>
              <input type="text" id="restaurant-name" value="${restaurant.name}" required />
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
            <h2 class="settings-subheading">${t("settings.categoriesHeading")}</h2>
            <p class="field-hint">${t("settings.categoriesHint")}</p>

            <div class="category-translate-list">
              ${categories
                .map(
                  (c) => `
                <div class="category-translate-row" data-id="${c.id}">
                  <input type="text" class="category-name-en" value="${c.name}" placeholder="${t("settings.categoryNameEn")}" />
                  <input type="text" class="category-name-ar" dir="rtl" value="${c.name_ar ?? ""}" placeholder="${t("settings.categoryNameAr")}" />
                  <button type="button" class="secondary-button save-category-row">${t("settings.save")}</button>
                </div>
              `
                )
                .join("") || `<p class="field-hint">${t("settings.noCategories")}</p>`}
            </div>

            <button class="secondary-button" id="add-category">${t("menuItems.addCategory")}</button>
          </div>
        </main>
      </div>
    `;

    renderLogoField();

    container.querySelector("#restaurant-select").addEventListener("change", (e) => {
      state.restaurantId = e.target.value;
      load();
    });

    container.querySelectorAll(".sidebar-lang-switch .lang-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.lang === getLanguage()) return;
        setLanguage(btn.dataset.lang);
        render(restaurant, categories);
      });
    });

    container.querySelectorAll(".save-category-row").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const row = btn.closest(".category-translate-row");
        const id = row.dataset.id;
        const name = row.querySelector(".category-name-en").value.trim();
        const nameAr = row.querySelector(".category-name-ar").value.trim();

        if (!name || !nameAr) {
          showToast("Both the English and Arabic name are required.", { type: "error" });
          return;
        }

        btn.disabled = true;
        const { error } = await supabase
          .from("categories")
          .update({ name, name_ar: nameAr })
          .eq("id", id);
        btn.disabled = false;

        if (error) {
          showToast("Couldn't save that category. Try again.", { type: "error" });
          return;
        }

        const category = categories.find((c) => c.id === id);
        if (category) Object.assign(category, { name, name_ar: nameAr });
        showToast("Category saved.", { type: "success" });
      });
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

  async function save(restaurant) {
    const saveBtn = container.querySelector("#save-settings");
    const statusBox = container.querySelector("#settings-status");
    const name = container.querySelector("#restaurant-name").value.trim();
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

    const { error } = await supabase
      .from("restaurants")
      .update({
        name,
        logo_url: logoUrl,
        deploy_webhook_url: deployWebhookUrl || null,
      })
      .eq("id", restaurant.id);

    saveBtn.disabled = false;
    saveBtn.textContent = "Save Settings";

    if (error) {
      statusBox.hidden = false;
      statusBox.className = "settings-status settings-status-error";
      statusBox.textContent = "Couldn't save settings. Try again.";
      return;
    }

    Object.assign(restaurant, {
      name,
      logo_url: logoUrl,
      deploy_webhook_url: deployWebhookUrl || null,
    });

    // Re-render so the sidebar logo, restaurant-switcher label, and every
    // other field reflect what was just saved, then show the success
    // message on the freshly-rendered status box (render() starts it hidden).
    await load();
    const freshStatusBox = container.querySelector("#settings-status");
    freshStatusBox.hidden = false;
    freshStatusBox.className = "settings-status settings-status-success";
    freshStatusBox.textContent = "Settings saved.";
  }

  load();
}
