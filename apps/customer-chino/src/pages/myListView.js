import { getList, updateQuantity, removeItem, clearAll, getTotal } from "../state/myList.js";
import { RIYAL_ICON_SVG } from "../riyalIcon.js";
import { t, localize } from "../i18n/index.js";
import { confirmModal } from "../components/confirmModal.js";

function describeOptions(selectedOptions) {
  const entries = Object.entries(selectedOptions || {});
  if (entries.length === 0) return "";
  return entries.map(([group, choice]) => `${group}: ${choice}`).join(" · ");
}

export function renderMyList(container, { onClose, onEditItem }) {
  const overlay = document.createElement("div");
  overlay.className = "my-list-overlay";
  container.appendChild(overlay);

  function draw() {
    const list = getList();
    const total = getTotal(list);

    overlay.innerHTML = `
      <div class="my-list-sheet">
        <div class="my-list-header">
          <h2>${t("myList.title")}</h2>
          ${list.length > 0 ? `<button class="icon-button" id="clear-all" aria-label="${t("myList.clearAll")}">🗑</button>` : ""}
          <button class="icon-button" id="close-my-list" aria-label="${t("myList.close")}">✕</button>
        </div>

        ${
          list.length === 0
            ? `<p class="my-list-empty">${t("myList.empty")}</p>`
            : `
          <div class="my-list-rows">
            ${list
              .map(
                (row) => `
              <div class="my-list-row" data-line-id="${row.lineId}">
                <div class="my-list-thumb">
                  ${row.photoUrl ? `<img src="${row.photoUrl}" alt="" />` : ""}
                </div>
                <div class="my-list-info">
                  <span class="my-list-name">${localize(row.name, row.nameAr)}</span>
                  ${describeOptions(row.selectedOptions) ? `<span class="my-list-options">${describeOptions(row.selectedOptions)}</span>` : ""}
                  <span class="my-list-price">${RIYAL_ICON_SVG} ${Number(row.price).toFixed(2)}</span>
                </div>
                <button class="icon-button edit-row" aria-label="${t("myList.edit")}">✎</button>
                <div class="quantity-stepper small">
                  <button class="row-qty-minus" aria-label="${t("myList.decrease")}">−</button>
                  <span>${row.quantity}</span>
                  <button class="row-qty-plus" aria-label="${t("myList.increase")}">+</button>
                </div>
                <button class="icon-button delete-row" aria-label="${t("myList.delete")}">🗑</button>
              </div>
            `
              )
              .join("")}
          </div>
        `
        }

        <div class="my-list-footer">
          <span class="call-waiter">${t("myList.callWaiter")}</span>
          <span class="my-list-total">${RIYAL_ICON_SVG} ${total.toFixed(2)}</span>
        </div>
      </div>
    `;

    overlay.querySelector("#close-my-list").addEventListener("click", onClose);

    overlay.querySelector("#clear-all")?.addEventListener("click", async () => {
      const confirmed = await confirmModal({
        title: t("myList.clearAll"),
        message: t("myList.clearConfirm"),
        confirmText: t("myList.clearButton"),
        danger: true,
      });
      if (!confirmed) return;
      clearAll();
      draw();
    });

    overlay.querySelectorAll(".my-list-row").forEach((rowEl) => {
      const lineId = rowEl.dataset.lineId;

      rowEl.querySelector(".edit-row").addEventListener("click", () => {
        const row = getList().find((i) => i.lineId === lineId);
        onEditItem(row);
      });

      rowEl.querySelector(".row-qty-minus").addEventListener("click", () => {
        const current = getList().find((i) => i.lineId === lineId);
        updateQuantity(lineId, current.quantity - 1);
        draw();
      });

      rowEl.querySelector(".row-qty-plus").addEventListener("click", () => {
        const current = getList().find((i) => i.lineId === lineId);
        updateQuantity(lineId, current.quantity + 1);
        draw();
      });

      rowEl.querySelector(".delete-row").addEventListener("click", () => {
        removeItem(lineId);
        draw();
      });
    });
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) onClose();
  });

  draw();
}
