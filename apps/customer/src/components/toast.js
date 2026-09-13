// Bottom-of-screen toast notification — replaces silent failures/successes
// with a visible, auto-dismissing message. type: "success" | "error".

let activeToast = null;
let dismissTimer = null;

export function showToast(message, { type = "success", duration = 2200 } = {}) {
  activeToast?.remove();
  clearTimeout(dismissTimer);

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  activeToast = toast;

  // Force a reflow so the enter transition actually runs.
  requestAnimationFrame(() => toast.classList.add("toast-visible"));

  dismissTimer = setTimeout(() => {
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 200);
  }, duration);
}
