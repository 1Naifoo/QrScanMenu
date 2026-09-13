// "My List" — the customer's on-screen selection list to show the waiter.
// Persisted to localStorage ONLY: survives an accidental refresh, never
// sent to any server, disappears if the customer clears browser data or
// leaves. Scoped per restaurant so testing multiple menus doesn't mix lists.
//
// Each row has its own lineId, separate from the underlying menu item's id
// — the same dish can appear as multiple distinct rows when ordered with
// different option choices (e.g. a Latte with Oat Milk vs. Full Fat).

const STORAGE_KEY = "scanmenu:mylist";

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — the list simply
    // won't persist across a refresh; the current in-memory session still works.
    return false;
  }
}

function makeLineId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sameOptions(a, b) {
  return JSON.stringify(a || {}) === JSON.stringify(b || {});
}

export function getList() {
  return read();
}

export function addItem(item, quantity = 1, selectedOptions = {}) {
  const list = read();
  const existing = list.find((i) => i.id === item.id && sameOptions(i.selectedOptions, selectedOptions));
  if (existing) {
    existing.quantity += quantity;
  } else {
    list.push({
      lineId: makeLineId(),
      id: item.id,
      name: item.name,
      nameAr: item.name_ar,
      price: item.price,
      photoUrl: item.photo_url,
      quantity,
      selectedOptions,
    });
  }
  const persisted = write(list);
  return { list, persisted };
}

export function updateQuantity(lineId, quantity) {
  let list = read();
  if (quantity <= 0) {
    list = list.filter((i) => i.lineId !== lineId);
  } else {
    const existing = list.find((i) => i.lineId === lineId);
    if (existing) existing.quantity = quantity;
  }
  write(list);
  return list;
}

export function removeItem(lineId) {
  const list = read().filter((i) => i.lineId !== lineId);
  write(list);
  return list;
}

export function clearAll() {
  write([]);
  return [];
}

export function getTotal(list = read()) {
  return list.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function getCount(list = read()) {
  return list.reduce((sum, i) => sum + i.quantity, 0);
}
