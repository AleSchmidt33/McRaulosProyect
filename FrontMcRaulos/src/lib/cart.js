// src/lib/cart.js
export const CART_KEY = "mcraulos_cart_v1";

function genUid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// === Lectura / Escritura ===
export function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items || []));
  window.dispatchEvent(new CustomEvent("cart:update", { detail: items || [] }));
}

// === Totales ===
export function countItems() {
  return readCart().reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
}

export function subtotal() {
  return readCart().reduce((acc, it) => {
    const precio = Number(it.precio) || 0;
    const qty = Number(it.qty) || 0;
    return acc + precio * qty;
  }, 0);
}

// Normaliza producto base
function normalizeProduct(prod, qty = 1) {
  const id = prod.id ?? prod.id_producto ?? prod._id;
  const nombre = prod.nombre ?? prod.name ?? "Producto";
  const precio = Number(prod.precio ?? prod.precio_base ?? prod.price ?? 0) || 0;
  const imagen =
    prod.imagen ??
    prod.imagen_url ??
    prod.url_imagen ??
    prod.image_url ??
    prod.image ??
    prod.foto ??
    null;

  return { id, nombre, precio, imagen, qty: Number(qty || 1) };
}

// === Agregar estándar (SIN custom) -> mergea por id ===
export function addItem(prod, qty = 1) {
  if (!prod) return;
  const base = normalizeProduct(prod, qty);
  if (base.id == null) return;

  const items = readCart();
  // merge SOLO si NO tiene custom (estándar)
  const idx = items.findIndex((x) => String(x.id) === String(base.id) && !x.custom && !x.uid);
  if (idx >= 0) {
    items[idx].qty = Number(items[idx].qty || 0) + Number(base.qty || 1);
  } else {
    items.push(base);
  }
  writeCart(items);
}

// === Agregar personalizado (CON custom) -> NUNCA mergea ===
export function addCustomItem(prod, custom, qty = 1) {
  if (!prod) return;
  const base = normalizeProduct(prod, qty);
  if (base.id == null) return;

  const item = {
    ...base,
    uid: genUid(),     // ID único para NO mergear
    custom: custom || null,
  };

  const items = readCart();
  items.push(item);
  writeCart(items);
}

// Helpers para encontrar por uid o id
function findIndexByIdOrUid(items, idOrUid) {
  const s = String(idOrUid);
  let idx = items.findIndex((x) => x.uid && String(x.uid) === s);
  if (idx === -1) idx = items.findIndex((x) => String(x.id) === s);
  return idx;
}

// Cambiar cantidad directa (acepta uid o id)
export function setQty(idOrUid, qty) {
  const items = readCart();
  const idx = findIndexByIdOrUid(items, idOrUid);
  if (idx >= 0) {
    const n = Math.max(1, Number(qty) || 1);
    items[idx].qty = n;
    writeCart(items);
  }
}

// Quitar ítem (acepta uid o id)
export function removeItem(idOrUid) {
  const s = String(idOrUid);
  const items = readCart().filter((x) => (x.uid ? String(x.uid) !== s : String(x.id) !== s));
  writeCart(items);
}

// Vaciar
export function clearCart() {
  writeCart([]);
}
