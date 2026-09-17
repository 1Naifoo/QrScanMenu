// Every page here builds markup with template-string `innerHTML`
// assignments. Any value that came from the menu data (restaurant/category/
// item fields — all admin-entered) MUST be passed through this before being
// interpolated into one of those templates — otherwise an admin account
// (or anyone who guesses/steals its password) entering e.g.
// `<img src=x onerror=...>` as an item name gets it executed in the
// browser of every customer who scans this restaurant's QR code.
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
