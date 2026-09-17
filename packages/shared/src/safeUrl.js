// Restaurant "Site URL" is admin-entered free text that ends up as a real,
// clickable <a href> in the sidebar ("View site"). HTML-escaping alone
// doesn't stop a javascript: URL from running when clicked, so only ever
// render it as a link if it's actually http(s) — anything else (including
// a blank/malformed value) renders as a plain '#' no-op link instead.
export function safeUrl(value) {
  if (typeof value !== "string") return "#";
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return value;
  } catch {
    // Not a valid absolute URL — fall through to the safe default.
  }
  return "#";
}
