// src/lib/order.js
export const LAST_ORDER_KEY = "mcraulos_ultimo_pedido_v1";

export function saveLastOrder(orderResponse) {
  try { localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(orderResponse)); } catch {}
}

export function getLastOrder() {
  try {
    const raw = localStorage.getItem(LAST_ORDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearLastOrder() {
  try { localStorage.removeItem(LAST_ORDER_KEY); } catch {}
}
