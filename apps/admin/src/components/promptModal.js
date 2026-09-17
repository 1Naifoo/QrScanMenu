// A styled stand-in for window.prompt() — supports one or more text
// fields. Resolves to an object keyed by each field's id, or null if
// cancelled/dismissed. Fields are required by default; pass
// `required: false` on a field to allow it to be left blank.

import { escapeHtml } from "@scanmenu/shared";

export function promptModal({ title, fields, confirmText = "OK" }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "prompt-modal-overlay";
    overlay.innerHTML = `
      <div class="prompt-modal">
        <h3>${escapeHtml(title)}</h3>
        ${fields
          .map(
            (field) => `
          <label for="prompt-modal-${field.id}">${escapeHtml(field.label)}</label>
          <input
            type="text"
            id="prompt-modal-${field.id}"
            placeholder="${escapeHtml(field.placeholder || "")}"
            autocomplete="off"
            dir="${field.dir || "auto"}"
          />
          <p class="prompt-modal-field-error" id="prompt-modal-${field.id}-error" hidden>This field is required.</p>
        `
          )
          .join("")}
        <div class="prompt-modal-actions">
          <button type="button" class="secondary-button" id="prompt-modal-cancel">Cancel</button>
          <button type="button" class="primary-button" id="prompt-modal-confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const inputs = fields.map((field) => overlay.querySelector(`#prompt-modal-${field.id}`));
    inputs[0].focus();

    function readValues() {
      return Object.fromEntries(fields.map((field, i) => [field.id, inputs[i].value.trim()]));
    }

    function close(value) {
      overlay.remove();
      resolve(value);
    }

    function trySubmit() {
      const values = readValues();
      let firstInvalid = null;

      fields.forEach((field, i) => {
        const isRequired = field.required !== false;
        const invalid = isRequired && !values[field.id];
        overlay.querySelector(`#prompt-modal-${field.id}-error`).hidden = !invalid;
        inputs[i].classList.toggle("prompt-modal-input-invalid", invalid);
        if (invalid && !firstInvalid) firstInvalid = inputs[i];
      });

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      close(values);
    }

    overlay.querySelector("#prompt-modal-cancel").addEventListener("click", () => close(null));
    overlay.querySelector("#prompt-modal-confirm").addEventListener("click", trySubmit);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(null);
    });
    inputs.forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close(null);
        if (e.key === "Enter") trySubmit();
      });
    });
  });
}
