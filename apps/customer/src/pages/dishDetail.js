import { addItem, removeItem } from "../state/myList.js";
import { RIYAL_ICON_SVG } from "../riyalIcon.js";
import { t, localize } from "../i18n/index.js";
import { showToast } from "../components/toast.js";
import { escapeHtml } from "../escapeHtml.js";

function notifyAdded({ persisted }) {
  // Still added for this session (in-memory) even if persisted is false —
  // but it won't survive a refresh, so say so instead of staying silent.
  if (persisted) {
    showToast(t("myList.addedToast"), { type: "success" });
  } else {
    showToast(t("myList.addFailedToast"), { type: "error", duration: 3200 });
  }
}

export function renderDishDetail(
  container,
  {
    item,
    onBack,
    onAdded,
    quickAdd = false,
    initialQuantity = 1,
    initialOptions = {},
    editingLineId = null,
  }
) {
  const optionGroups = item.options || [];

  // Quick-add (tapping "Add" on a menu card) only ever reaches this
  // component for option-less items — see menuHome.js — but guard here
  // too in case that ever changes, since a required choice can't be made
  // without opening the full screen below.
  if (quickAdd && optionGroups.length === 0) {
    notifyAdded(addItem(item, 1));
    onAdded();
    return;
  }

  let quantity = initialQuantity;
  const selectedOptions = { ...initialOptions };
  const allergiesText = localize(item.allergies, item.allergies_ar);
  const allergiesList = allergiesText
    ? allergiesText.split(",").map((a) => a.trim()).filter(Boolean)
    : [];

  container.innerHTML = `
    <div class="dish-detail">
      <div class="dish-detail-header">
        <button class="back-button" id="back-button" aria-label="${t("dish.back")}">‹</button>
      </div>

      <div class="dish-photo">
        ${item.photo_url ? `<img src="${escapeHtml(item.photo_url)}" alt="${escapeHtml(item.name)}" />` : ""}
      </div>

      <div class="dish-body">
        <div class="dish-name-row">
          <h1 class="dish-name">${escapeHtml(localize(item.name, item.name_ar))}</h1>
          ${item.calories ? `<span class="dish-calories">${item.calories} ${t("dish.caloriesUnit")}</span>` : ""}
        </div>
        ${
          item.description
            ? `<p class="dish-section-label">${t("dish.descriptionLabel")}</p><p class="dish-description">${escapeHtml(localize(item.description, item.description_ar))}</p>`
            : ""
        }

        ${
          item.is_spicy
            ? `<div class="spicy-badge"><span class="spicy-badge-icon">🌶️</span><span class="spicy-badge-label">${t("dish.spicy")}</span></div>`
            : ""
        }

        ${optionGroups
          .map(
            (group) => `
          <div class="option-group" data-group="${escapeHtml(group.name)}">
            <p class="dish-section-label">${escapeHtml(group.name)}</p>
            <div class="option-choices">
              ${group.choices
                .map(
                  (choice) => `
                <button
                  type="button"
                  class="option-choice ${selectedOptions[group.name] === choice ? "active" : ""}"
                  data-choice="${escapeHtml(choice)}"
                >${escapeHtml(choice)}</button>
              `
                )
                .join("")}
            </div>
            <p class="option-group-error" hidden>${t("dish.optionRequired")}</p>
          </div>
        `
          )
          .join("")}

        ${
          allergiesList.length > 0
            ? `
          <div class="option-group">
            <p class="dish-section-label">${t("dish.allergiesLabel")}</p>
            <div class="option-choices">
              ${allergiesList.map((a) => `<span class="option-choice option-choice-static">${escapeHtml(a)}</span>`).join("")}
            </div>
          </div>
        `
            : ""
        }
      </div>

      <div class="dish-footer">
        <span class="dish-price">${RIYAL_ICON_SVG} ${Number(item.price).toFixed(2)}</span>
        <div class="quantity-stepper">
          <button id="qty-minus" aria-label="${t("dish.decreaseQty")}">−</button>
          <span id="qty-value">${quantity}</span>
          <button id="qty-plus" aria-label="${t("dish.increaseQty")}">+</button>
        </div>
        <button class="add-to-list-button" id="add-to-list">${t("dish.addToList")}</button>
      </div>
    </div>
  `;

  const qtyValue = container.querySelector("#qty-value");

  container.querySelector("#back-button").addEventListener("click", onBack);

  container.querySelector("#qty-minus").addEventListener("click", () => {
    quantity = Math.max(1, quantity - 1);
    qtyValue.textContent = quantity;
  });

  container.querySelector("#qty-plus").addEventListener("click", () => {
    quantity += 1;
    qtyValue.textContent = quantity;
  });

  container.querySelectorAll(".option-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.closest(".option-group");
      const groupName = group.dataset.group;
      selectedOptions[groupName] = btn.dataset.choice;
      group.querySelectorAll(".option-choice").forEach((b) => b.classList.toggle("active", b === btn));
      group.querySelector(".option-group-error").hidden = true;
    });
  });

  container.querySelector("#add-to-list").addEventListener("click", () => {
    let firstInvalidGroup = null;
    optionGroups.forEach((group) => {
      const groupEl = container.querySelector(`.option-group[data-group="${CSS.escape(group.name)}"]`);
      const invalid = !selectedOptions[group.name];
      groupEl.querySelector(".option-group-error").hidden = !invalid;
      if (invalid && !firstInvalidGroup) firstInvalidGroup = groupEl;
    });

    if (firstInvalidGroup) {
      firstInvalidGroup.scrollIntoView({ behavior: "smooth", block: "center" });
      showToast(t("dish.optionRequiredToast"), { type: "error" });
      return;
    }

    // Editing an existing row: drop the original first, so the new
    // quantity/options replace it instead of merging on top (addItem()
    // otherwise adds onto any row with matching id + options).
    if (editingLineId) removeItem(editingLineId);
    notifyAdded(addItem(item, quantity, selectedOptions));
    onAdded();
  });
}
