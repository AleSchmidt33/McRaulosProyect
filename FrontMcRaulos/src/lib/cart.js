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

// =================== NUEVO: Payload para el backend ===================

export const toBackendOrderPayload = (orderType = "comer-aca") => {
  const items = readCart();
  
  // Mapeo de tipo de pedido: 1=llevar, 2=comer aquí
  const id_tipo_pedido = orderType === "para-llevar" ? 1 : 2;
  
  const productos = [];
  
  for (const item of items) {
    const baseProducto = {
      id_producto: item.id,
      notas: item.nota || item.note || null,
      ingredientes_personalizados: []
    };
    
    // Si tiene custom.ingredients, procesamos los ingredientes
    if (item.custom?.ingredients && Array.isArray(item.custom.ingredients)) {
      for (const ing of item.custom.ingredients) {
        const qty = safeNumber(ing.qty, 1);
        
        // Solo agregamos si NO es la cantidad base (1)
        if (qty === 0) {
          // Ingrediente removido
          baseProducto.ingredientes_personalizados.push({
            id_ingrediente: ing.id ?? ing.id_ingrediente,
            cantidad: 1,
            es_extra: false  // false = se remueve
          });
        } else if (qty >= 2) {
          // Ingrediente extra (qty - 1 porque 1 es base)
          baseProducto.ingredientes_personalizados.push({
            id_ingrediente: ing.id ?? ing.id_ingrediente,
            cantidad: qty - 1,  // Solo lo adicional
            es_extra: true  // true = se agrega
          });
        }
        // qty === 1 no se envía (es la cantidad base normal)
      }
    }
    
    // Repetimos el producto según la cantidad
    const cantidad = Math.max(1, safeNumber(item.qty, 1));
    for (let i = 0; i < cantidad; i++) {
      productos.push({ ...baseProducto });
    }
  }
  
  return {
    id_cliente: 1,  // Siempre usa cliente 1 (consumidor final)
    id_tipo_pedido,
    // id_cupon: null,  // Lo omitimos por ahora
    productos
  };
};