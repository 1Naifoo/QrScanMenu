// UI-chrome translations, plus localize() for admin-entered bilingual
// content (category/item name & description — see the *_ar columns added
// in supabase/migrations/20260912000000_add_arabic_content_fields.sql).

import en from "./en.json";
import ar from "./ar.json";

const STRINGS = { en, ar };
const STORAGE_KEY = "scanmenu-lang";

let currentLang = "en";

function applyDocumentDirection() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
}

export function initLanguage(defaultLang = "en") {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable (private browsing, etc.) — fall back silently.
  }
  currentLang = STRINGS[saved] ? saved : STRINGS[defaultLang] ? defaultLang : "en";
  applyDocumentDirection();
}

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

// Picks the Arabic value when the site is in Arabic and one was entered by
// the admin; otherwise falls back to the English value.
export function localize(value, valueAr) {
  return currentLang === "ar" && valueAr ? valueAr : value;
}
