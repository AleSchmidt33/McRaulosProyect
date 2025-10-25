// =================== Cart util - McRaulos ===================

const KEY = "mcraulos_cart_v1";
const CART_EVENT = "mcraulos:cart-changed";

// -------- helpers --------
const safeNumber = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const genUid = () =>
  "it" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

const notify = () => {
  try {
    window.dispatchEvent(new Event(CART_EVENT));
  } catch { /* no-op */ }
};

// -------- base I/O --------
export const readCart = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

export const writeCart = (items) => {
  // NO llama a readCart: evita recursión
  const arr = Array.isArray(items) ? items : [];
  localStorage.setItem(KEY, JSON.stringify(arr));
  notify();
};

// -------- normalización --------
const normalizeProduct = (prod, qty = 1) => {
  if (!prod || typeof prod !== "object") return null;

  const id =
    prod.id ??
    prod.id_producto ??
    prod.producto_id ??
    prod.productoId ??
    null;

  const nombre = prod.nombre ?? prod.name ?? prod.titulo ?? "Producto";

  const precioUnit = safeNumber(
    prod.precio ?? prod.precio_unit ?? prod.precio_unitario ?? prod.price ?? 0,
    0
  );

  const cantidad = Math.max(1, safeNumber(qty, 1));
  const subtotal = precioUnit * cantidad;

  return { id, nombre, precio: precioUnit, qty: cantidad, subtotal };
};

const deriveExtras = (custom) => {
  const arr = Array.isArray(custom?.ingredients) ? custom.ingredients : [];
  return arr
    .filter((x) => safeNumber(x.qty, 1) > 1)
    .map((x) => ({
      id_ingrediente: x.id ?? x.id_ingrediente ?? null,
      nombre: x.nombre ?? x.name ?? "Ingrediente",
      cantidad: safeNumber(x.qty, 2) - 1, // solo lo adicional
    }));
};

// -------- API del carrito --------
export const addItem = (prod, qty = 1) => {
  const base = normalizeProduct(prod, qty);
  if (!base) return null;

  const item = { ...base, uid: genUid(), custom: null, extras: null };
  const items = readCart();
  items.push(item);
  writeCart(items);
  return item;
};

// Guarda aunque tenga modificaciones; mantiene custom y agrega extras separados
export const addCustomItem = (prod, custom, qty = 1) => {
  const base = normalizeProduct(prod, qty);
  if (!base) return null;

  const extras = deriveExtras(custom);
  const item = {
    ...base,
    uid: genUid(),
    custom: custom && typeof custom === "object" ? custom : null,
    extras: extras.length ? extras : null,
  };

  const items = readCart();
  items.push(item);
  writeCart(items);
  return item;
};

export const updateQty = (uid, qty) => {
  const items = readCart();
  const i = items.findIndex((x) => x.uid === uid);
  if (i === -1) return;

  const q = Math.max(1, safeNumber(qty, 1));
  items[i].qty = q;
  items[i].subtotal = safeNumber(items[i].precio, 0) * q;
  writeCart(items);
};

export const removeItem = (uid) => {
  const items = readCart().filter((x) => x.uid !== uid);
  writeCart(items);
};

export const clearCart = () => writeCart([]);

export const getCartCount = () =>
  readCart().reduce((acc, it) => acc + safeNumber(it.qty, 1), 0);

// alias por compatibilidad con código previo
export const countItems = getCartCount;

export const getCartTotal = () =>
  readCart().reduce((acc, it) => acc + safeNumber(it.subtotal, 0), 0);

// ✅ alias requerido por CheckoutScreen
export const subtotal = getCartTotal;

// Por si algún componente quiere items crudos
export const getCartItems = readCart;

export const subscribeCart = (fn) => {
  const handler = () => fn(readCart());
  window.addEventListener(CART_EVENT, handler);
  window.addEventListener("storage", handler); // cross-tab
  return () => {
    window.removeEventListener(CART_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
};
