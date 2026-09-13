import { getCount } from "../state/myList.js";
import { RIYAL_ICON_SVG } from "../riyalIcon.js";
import { t, getLanguage, setLanguage, localize } from "../i18n/index.js";

export function renderMenuHome(container, { menu, onOpenItem, onOpenMyList }) {
  const { restaurant, items } = menu;
  const categories = menu.categories.filter((c) => c.is_available !== false);

  const itemsByCategory = Object.fromEntries(
    categories.map((c) => [c.id, items.filter((i) => i.category_id === c.id)])
  );

  // Highlight one or more dishes on the home screen as a teaser —
  // whichever items the admin explicitly chose (Settings), or if none are
  // set yet, fall back to the first available item with a photo and a
  // featured caption written by the admin.
  const chosenFeatured = (restaurant.featuredItemIds || [])
    .map((id) => items.find((i) => i.id === id && i.is_available))
    .filter(Boolean);
  const featuredItems =
    chosenFeatured.length > 0
      ? chosenFeatured
      : [items.find((i) => i.is_available && i.photo_url && i.featured_caption)].filter(Boolean);

  let observer = null;

  function draw() {
    container.innerHTML = `
      <header class="menu-header">
        <div class="lang-switch">
          <button class="lang-option ${getLanguage() === "en" ? "active" : ""}" data-lang="en">English</button>
          <button class="lang-option ${getLanguage() === "ar" ? "active" : ""}" data-lang="ar">العربية</button>
        </div>
        ${restaurant.logoUrl ? `<img class="menu-logo" src="${restaurant.logoUrl}" alt="${restaurant.name}" />` : `<span class="menu-logo-text">${restaurant.name}</span>`}
        <button class="my-list-shortcut" id="open-my-list">
          <svg class="my-list-icon" viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7L6 8Z" stroke-linejoin="round"/><path d="M9 8V6a3 3 0 0 1 6 0v2" stroke-linecap="round"/></svg>
          ${t("menu.myListButton")}
          <span class="my-list-badge" id="my-list-badge">${getCount()}</span>
        </button>
      </header>

      <nav class="category-pills">
        ${categories
          .map(
            (c, i) =>
              `<button class="category-pill ${i === 0 ? "active" : ""}" data-target="category-${c.id}" data-category-id="${c.id}">${localize(c.name, c.name_ar)}</button>`
          )
          .join("")}
      </nav>

      <main class="menu-body">
        ${featuredItems
          .map((featuredItem) => {
            const caption = localize(featuredItem.featured_caption, featuredItem.featured_caption_ar);
            return `
          <section class="featured-card">
            <p class="featured-card-eyebrow">${t("menu.featuredEyebrow")}</p>
            <div class="featured-card-body">
              <div class="featured-card-photo"><img src="${featuredItem.photo_url}" alt="" /></div>
              <div>
                <h3 class="featured-card-name">${localize(featuredItem.name, featuredItem.name_ar)}</h3>
                ${caption ? `<p class="featured-card-caption">${caption}</p>` : ""}
              </div>
            </div>
          </section>
        `;
          })
          .join("")}
        ${categories
          .map((category) => {
            const categoryItems = (itemsByCategory[category.id] || []).filter((i) => i.is_available);
            if (categoryItems.length === 0) return "";
            return `
              <section class="category-section" id="category-${category.id}" data-category-id="${category.id}">
                <h2 class="category-title">${localize(category.name, category.name_ar)}</h2>
                <div class="item-grid">
                  ${categoryItems
                    .map(
                      (item) => `
                    <button class="item-card" data-item-id="${item.id}">
                      <div class="item-card-photo">
                        ${item.photo_url ? `<img src="${item.photo_url}" alt="${item.name}" />` : ""}
                      </div>
                      <div class="item-card-name">${localize(item.name, item.name_ar)}</div>
                      <div class="item-card-footer">
                        <span class="item-card-price">${RIYAL_ICON_SVG} ${Number(item.price).toFixed(2)}</span>
                        <span class="item-card-add" data-add-id="${item.id}">${t("itemCard.add")}</span>
                      </div>
                    </button>
                  `
                    )
                    .join("")}
                </div>
              </section>
            `;
          })
          .join("")}
      </main>
    `;

    container.querySelectorAll(".lang-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.lang === getLanguage()) return;
        setLanguage(btn.dataset.lang);
        draw();
      });
    });

    container.querySelectorAll(".category-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.getElementById(pill.dataset.target)?.scrollIntoView({ behavior: "smooth" });
      });
    });

    // Highlight whichever category section is currently in view as the
    // user scrolls, instead of only ever showing the first pill active.
    observer?.disconnect();
    const sections = container.querySelectorAll(".category-section");
    if (sections.length > 0) {
      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries.find((e) => e.isIntersecting);
          if (!visible) return;
          container.querySelectorAll(".category-pill").forEach((pill) => {
            pill.classList.toggle("active", pill.dataset.categoryId === visible.target.dataset.categoryId);
          });
        },
        { rootMargin: "-96px 0px -70% 0px" }
      );
      sections.forEach((section) => observer.observe(section));
    }

    container.querySelectorAll(".item-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        const id = card.dataset.itemId;
        const item = items.find((i) => i.id === id);

        // Tapping "Add" adds directly from the card; tapping elsewhere on
        // the card opens the full Dish Details screen (Page 2). An item
        // with required option groups (e.g. Milk Type) always needs the
        // full screen, since there's nowhere on the card to make a choice.
        const hasOptions = item.options && item.options.length > 0;
        if (e.target.dataset.addId && !hasOptions) {
          onOpenItem(item, { quickAdd: true });
        } else {
          onOpenItem(item, { quickAdd: false });
        }
      });
    });

    container.querySelector("#open-my-list").addEventListener("click", onOpenMyList);
  }

  draw();
}

export function updateMyListBadge(container) {
  const badge = container.querySelector("#my-list-badge");
  if (badge) badge.textContent = getCount();
}
