// Admin panel's own UI language — separate from a restaurant's
// language_default (that's the customer site's default, set via its own
// data, not this). First pass covers the sidebar and the two built pages'
// main chrome; modal dialogs and the Edit Item form aren't translated yet.

import en from "./en.json";
import ar from "./ar.json";

const STRINGS = { en, ar };
const STORAGE_KEY = "scanmenu-admin-lang";

let currentLang = "en";

function applyDocumentDirection() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
}

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (STRINGS[saved]) currentLang = saved;
} catch {
  // localStorage unavailable — default to English for this session.
}
applyDocumentDirection();

export function getLanguage() {
  return currentLang;
}

export function setLanguage(lang) {
  if (!STRINGS[lang]) return;
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not persisted this session — language still applies until reload.
  }
  applyDocumentDirection();
}

export function t(key) {
  return STRINGS[currentLang][key] ?? STRINGS.en[key] ?? key;
}
