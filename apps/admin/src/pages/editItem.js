// Edit Item — add or edit a single dish.
// Desktop: right-hand slide-over panel over the Menu Items list.
// Mobile: full-screen step with a back chevron.
// Both share this same markup; styles.css handles the layout switch.

import { promptModal } from "../components/promptModal.js";
import { cropImage } from "../components/cropModal.js";
import { showToast } from "../components/toast.js";
import { RIYAL_ICON_SVG } from "@scanmenu/shared";

export function renderEditItem(container, { supabase, restaurant, categories, item, onDone, onClose }) {
  const isNew = !item;
  let selectedFile = null;
  let photoPreviewUrl = item?.photo_url || "";
  let photoRemoved = false;
  // Deep-copy so editing here can't mutate the original item object until Save.
  let optionGroups = (item?.options ?? []).map((g) => ({ name: g.name, choices: [...g.choices] }));

  const overlay = document.createElement("div");
  overlay.className = "edit-item-overlay";
  overlay.innerHTML = `
    <div class="edit-item-panel">
      <div class="edit-item-header">
        <button class="icon-button back-chevron" id="close-panel" aria-label="Back">‹</button>
        <h2>${isNew ? "Add Item" : "Edit Item"}</h2>
      </div>

      <div class="edit-item-body">
        <div class="photo-field" id="photo-field"></div>

        <div class="field">
          <label for="item-name">Name (English)</label>
          <input type="text" id="item-name" value="${item?.name ?? ""}" required />
        </div>

        <div class="field">
          <label for="item-name-ar">Name (Arabic) — optional</label>
          <input type="text" id="item-name-ar" dir="rtl" value="${item?.name_ar ?? ""}" />
        </div>

        <div class="field">
          <label for="item-category">Category</label>
          <select id="item-category">
            ${categories.map((c) => `<option value="${c.id}" ${c.id === item?.category_id ? "selected" : ""}>${c.name}</option>`).join("")}
            <option value="__new__">+ New category…</option>
          </select>
        </div>

        <div class="field">
          <label for="item-description">Description (English)</label>
          <textarea id="item-description" rows="3">${item?.description ?? ""}</textarea>
        </div>

        <div class="field">
          <label for="item-description-ar">Description (Arabic)</label>
          <textarea id="item-description-ar" dir="rtl" rows="3">${item?.description_ar ?? ""}</textarea>
        </div>

        <div class="field">
          <label for="item-ingredients">Ingredients (one per line)</label>
          <textarea id="item-ingredients" rows="4" placeholder="Sesame bun&#10;Crisp lettuce&#10;Beef patty">${(item?.ingredients ?? []).join("\n")}</textarea>
        </div>

        <div class="field">
          <label for="item-calories">Calories</label>
          <input type="number" id="item-calories" min="0" step="1" value="${item?.calories ?? ""}" />
        </div>

        <div class="field">
          <label for="item-allergies">Allergies (English)</label>
          <input type="text" id="item-allergies" placeholder="Contains nuts, dairy" value="${item?.allergies ?? ""}" />
        </div>

        <div class="field">
          <label for="item-allergies-ar">Allergies (Arabic)</label>
          <input type="text" id="item-allergies-ar" dir="rtl" value="${item?.allergies_ar ?? ""}" />
        </div>

        <div class="field">
          <label for="item-featured-caption">Featured card text (English)</label>
          <textarea id="item-featured-caption" rows="2">${item?.featured_caption ?? ""}</textarea>
          <p class="field-hint">Shown on the customer site's home screen if this item is chosen as Featured in Settings. Leave blank to skip that card.</p>
        </div>

        <div class="field">
          <label for="item-featured-caption-ar">Featured card text (Arabic)</label>
          <textarea id="item-featured-caption-ar" dir="rtl" rows="2">${item?.featured_caption_ar ?? ""}</textarea>
        </div>

        <div class="field">
          <label>Options</label>
          <p class="field-hint">
            A group (e.g. "Milk Type") shows as a row of buttons the customer picks
            one from before they can add this item to their list.
          </p>
          <div id="options-field"></div>
        </div>

        <div class="field-split">
          <div class="field">
            <label for="item-price">Price</label>
            <div class="price-input-group">
              <span class="price-input-icon">${RIYAL_ICON_SVG}</span>
              <input type="number" id="item-price" min="0" step="0.01" value="${item?.price ?? ""}" required />
            </div>
          </div>

          <div class="field field-toggle">
            <label for="item-spicy">Spicy</label>
            <label class="toggle-switch">
              <input type="checkbox" id="item-spicy" ${item?.is_spicy ? "checked" : ""} />
              <span class="toggle-track"></span>
            </label>
          </div>
        </div>

        <div class="field field-row">
          <label for="item-available">Available</label>
          <label class="toggle-switch">
            <input type="checkbox" id="item-available" ${item?.is_available !== false ? "checked" : ""} />
            <span class="toggle-track"></span>
          </label>
        </div>

        <div class="edit-item-error" id="edit-item-error" hidden></div>
      </div>

      <div class="edit-item-footer">
        <button class="secondary-button" id="cancel-edit">Cancel</button>
        <button class="primary-button" id="save-edit">Save Item</button>
      </div>
    </div>
  `;
  container.appendChild(overlay);

  const closePanel = () => {
    overlay.remove();
    onClose();
  };

  overlay.querySelector("#close-panel").addEventListener("click", closePanel);
  overlay.querySelector("#cancel-edit").addEventListener("click", closePanel);

  async function promptNewCategory() {
    const values = await promptModal({
      title: "New Category",
      fields: [
        { id: "name", label: "Category name (English)" },
        { id: "nameAr", label: "Category name (Arabic)", dir: "rtl" },
      ],
      confirmText: "Add",
    });
    const select = overlay.querySelector("#item-category");
    select.value = categories[0]?.id ?? "__new__";
    if (!values) return;
    const { data, error } = await supabase
      .from("categories")
      .insert({
        restaurant_id: restaurant.id,
        name: values.name,
        name_ar: values.nameAr,
        sort_order: categories.length + 1,
      })
      .select()
      .single();
    if (error) {
      showToast("Couldn't create that category. Try again.", { type: "error" });
      return;
    }
    categories.push(data);
    const opt = document.createElement("option");
    opt.value = data.id;
    opt.textContent = data.name;
    opt.selected = true;
    select.insertBefore(opt, select.lastElementChild);
    showToast("Category added.", { type: "success" });
  }

  overlay.querySelector("#item-category").addEventListener("change", (e) => {
    if (e.target.value !== "__new__") return;
    promptNewCategory();
  });

  // With no categories yet, the select's only option is already "+ New
  // category…" — a select never fires "change" when re-selecting the
  // option that's already selected, so the picker above can't be relied
  // on to start the flow. Prompt immediately in that case instead.
  if (categories.length === 0) promptNewCategory();

  function renderPhotoField() {
    const field = overlay.querySelector("#photo-field");
    field.innerHTML = `
      <div class="photo-preview" id="photo-preview">
        ${photoPreviewUrl ? `<img src="${photoPreviewUrl}" alt="" />` : `<span>No photo yet</span>`}
        <label class="change-photo-button">
          📷 Change Photo
          <input type="file" accept="image/*" id="photo-input" hidden />
        </label>
      </div>
      ${photoPreviewUrl ? `<button type="button" class="link-button photo-remove-button" id="remove-photo">Remove photo</button>` : ""}
    `;

    field.querySelector("#photo-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      const cropped = await cropImage(file, { aspectRatio: 4 / 3 });
      if (!cropped) return;
      selectedFile = cropped;
      photoRemoved = false;
      photoPreviewUrl = URL.createObjectURL(cropped);
      renderPhotoField();
    });

    const removeBtn = field.querySelector("#remove-photo");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        selectedFile = null;
        photoRemoved = true;
        photoPreviewUrl = "";
        renderPhotoField();
      });
    }
  }

  renderPhotoField();

  function renderOptionsField() {
    const field = overlay.querySelector("#options-field");
    field.innerHTML = `
      <div class="option-group-editor-list">
        ${optionGroups
          .map(
            (group, gi) => `
          <div class="option-group-editor" data-group-index="${gi}">
            <div class="option-group-editor-header">
              <span class="option-group-editor-name">${group.name}</span>
              <button type="button" class="link-button remove-option-group" data-group-index="${gi}">Remove group</button>
            </div>
            <div class="option-choice-chips">
              ${group.choices
                .map(
                  (choice, ci) => `
                <span class="option-choice-chip">
                  ${choice}
                  <button type="button" class="remove-choice-chip" data-group-index="${gi}" data-choice-index="${ci}" aria-label="Remove ${choice}">×</button>
                </span>
              `
                )
                .join("")}
              <button type="button" class="add-choice-chip" data-group-index="${gi}">+ Add Choice</button>
            </div>
          </div>
        `
          )
          .join("") || `<p class="field-hint">No option groups yet.</p>`}
      </div>
      <button type="button" class="secondary-button" id="add-option-group">+ Add Option Group</button>
    `;

    field.querySelector("#add-option-group").addEventListener("click", async () => {
      const values = await promptModal({
        title: "New Option Group",
        fields: [{ id: "name", label: "Group name (e.g. Milk Type)" }],
        confirmText: "Add",
      });
      if (!values) return;
      optionGroups.push({ name: values.name, choices: [] });
      renderOptionsField();
    });

    field.querySelectorAll(".add-choice-chip").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const gi = Number(btn.dataset.groupIndex);
        const values = await promptModal({
          title: `New Choice — ${optionGroups[gi].name}`,
          fields: [{ id: "choice", label: "Choice (e.g. Oat Milk)" }],
          confirmText: "Add",
        });
        if (!values) return;
        optionGroups[gi].choices.push(values.choice);
        renderOptionsField();
      });
    });

    field.querySelectorAll(".remove-choice-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const gi = Number(btn.dataset.groupIndex);
        const ci = Number(btn.dataset.choiceIndex);
        optionGroups[gi].choices.splice(ci, 1);
        renderOptionsField();
      });
    });

    field.querySelectorAll(".remove-option-group").forEach((btn) => {
      btn.addEventListener("click", () => {
        const gi = Number(btn.dataset.groupIndex);
        optionGroups.splice(gi, 1);
        renderOptionsField();
      });
    });
  }

  renderOptionsField();

  function showError(message) {
    const box = overlay.querySelector("#edit-item-error");
    box.textContent = message;
    box.hidden = false;
  }

  overlay.querySelector("#save-edit").addEventListener("click", async () => {
    const name = overlay.querySelector("#item-name").value.trim();
    const nameAr = overlay.querySelector("#item-name-ar").value.trim();
    const categoryId = overlay.querySelector("#item-category").value;
    const description = overlay.querySelector("#item-description").value.trim();
    const descriptionAr = overlay.querySelector("#item-description-ar").value.trim();
    const ingredients = overlay
      .querySelector("#item-ingredients")
      .value.split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const featuredCaption = overlay.querySelector("#item-featured-caption").value.trim();
    const featuredCaptionAr = overlay.querySelector("#item-featured-caption-ar").value.trim();
    const caloriesRaw = overlay.querySelector("#item-calories").value.trim();
    const calories = caloriesRaw ? parseInt(caloriesRaw, 10) : null;
    const allergies = overlay.querySelector("#item-allergies").value.trim();
    const allergiesAr = overlay.querySelector("#item-allergies-ar").value.trim();
    const options = optionGroups.filter((g) => g.choices.length > 0);
    const price = parseFloat(overlay.querySelector("#item-price").value);
    const isSpicy = overlay.querySelector("#item-spicy").checked;
    const isAvailable = overlay.querySelector("#item-available").checked;

    if (!name || Number.isNaN(price) || price < 0) {
      showError("Enter a name and a valid price before saving.");
      return;
    }

    if (!description || !descriptionAr) {
      showError("Enter both an English and Arabic description before saving.");
      return;
    }

    if (Boolean(featuredCaption) !== Boolean(featuredCaptionAr)) {
      showError("Enter the featured card text in both languages, or leave both blank.");
      return;
    }

    if (caloriesRaw && (Number.isNaN(calories) || calories < 0)) {
      showError("Calories must be a positive number.");
      return;
    }

    if (Boolean(allergies) !== Boolean(allergiesAr)) {
      showError("Enter allergies in both languages, or leave both blank.");
      return;
    }

    const saveBtn = overlay.querySelector("#save-edit");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    let photoUrl = item?.photo_url ?? null;

    if (selectedFile) {
      const path = `${restaurant.slug}/${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("dish-photos")
        .upload(path, selectedFile, { upsert: true });

      if (uploadError) {
        showError("Couldn't upload that photo. Try a different file.");
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Item";
        return;
      }

      photoUrl = supabase.storage.from("dish-photos").getPublicUrl(path).data.publicUrl;
    } else if (photoRemoved) {
      photoUrl = null;
    }

    const payload = {
      restaurant_id: restaurant.id,
      category_id: categoryId,
      name,
      name_ar: nameAr || null,
      description,
      description_ar: descriptionAr,
      ingredients,
      featured_caption: featuredCaption || null,
      featured_caption_ar: featuredCaptionAr || null,
      calories,
      allergies: allergies || null,
      allergies_ar: allergiesAr || null,
      options,
      price,
      is_spicy: isSpicy,
      is_available: isAvailable,
      photo_url: photoUrl,
    };

    const { error } = isNew
      ? await supabase.from("items").insert(payload)
      : await supabase.from("items").update(payload).eq("id", item.id);

    if (error) {
      showError("Couldn't save this item. Check the fields and try again.");
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Item";
      return;
    }

    overlay.remove();
    onDone();
    onClose();
    showToast(isNew ? "Item added." : "Item saved.", { type: "success" });
  });
}
