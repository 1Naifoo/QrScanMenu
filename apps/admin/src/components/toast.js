// Bottom-of-screen toast notification — replaces window.alert() with a
// non-blocking, auto-dismissing message. type: "success" | "error".

let activeToast = null;
let dismissTimer = null;

export function showToast(message, { type = "success", duration = 2600 } = {}) {
  activeToast?.remove();
  clearTimeout(dismissTimer);

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  activeToast = toast;

  requestAnimationFrame(() => toast.classList.add("toast-visible"));

  dismissTimer = setTimeout(() => {
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 200);
  }, duration);
}
