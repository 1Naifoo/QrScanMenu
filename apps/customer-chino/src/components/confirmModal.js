// A themed stand-in for window.confirm(). Resolves to true/false.

export function confirmModal({ title, message, confirmText = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-modal-overlay";
    overlay.innerHTML = `
      <div class="confirm-modal">
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="confirm-modal-actions">
          <button type="button" class="confirm-modal-cancel" id="confirm-modal-cancel">Cancel</button>
          <button type="button" class="confirm-modal-confirm ${danger ? "danger" : ""}" id="confirm-modal-confirm">${confirmText}</button>
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
