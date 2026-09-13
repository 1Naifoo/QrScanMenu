// A styled stand-in for window.confirm(). Resolves to true/false.

export function confirmModal({ title, message, confirmText = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "prompt-modal-overlay";
    overlay.innerHTML = `
      <div class="prompt-modal">
        <h3>${title}</h3>
        <p class="confirm-modal-message">${message}</p>
        <div class="prompt-modal-actions">
          <button type="button" class="secondary-button" id="confirm-modal-cancel">Cancel</button>
          <button type="button" class="${danger ? "danger-button" : "primary-button"}" id="confirm-modal-confirm">${confirmText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    function close(result) {
      overlay.remove();
      resolve(result);
    }

    overlay.querySelector("#confirm-modal-cancel").addEventListener("click", () => close(false));
    overlay.querySelector("#confirm-modal-confirm").addEventListener("click", () => close(true));
  });
}
