// Every page in this codebase builds markup with template-string
// `innerHTML` assignments rather than a framework that escapes by default.
// Any value that came from a database row (restaurant/category/item
// fields, admin-entered text) MUST be passed through this before being
// interpolated into one of those templates — otherwise an admin who enters
// e.g. `<img src=x onerror=...>` as an item name gets it executed in every
// browser that renders that markup (other admins in the panel, or every
// customer scanning that restaurant's QR code on the public menu site).
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
