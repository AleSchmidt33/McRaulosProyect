// src/lib/orders.js
export const CART_KEY = "mcraulos_cart_v1";
const OUTBOX_KEY = "orders_outbox_v1";
export const BACK_ORIGIN = (import.meta.env.VITE_BACK_ORIGIN || "").replace(/\/$/, "");

// ---------- Helpers LS ----------
export function readCartLS() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];
  } catch { return []; }
}

export function buildOrderPayload(items, orderType = "comer-aca") {
  const safe = (items || []).map((it) => {
    const qty = Number(it?.qty ?? 1);
    const unit = Number(it?.precio ?? it?.price ?? 0);
    return {
      product_id: it?.id_producto ?? it?.id ?? it?._id ?? null,
      title: String(it?.nombre ?? it?.name ?? "Producto"),
      quantity: qty,
      unit_price: unit,
      subtotal: qty * unit,
      custom: {
        extras: it?.extras ?? it?.custom?.extras ?? null,
        removed: it?.removidos ?? it?.custom?.removed ?? null,
        ingredients: it?.custom?.ingredients ?? null,
      },
    };
  });
  const total = safe.reduce((a, i) => a + i.subtotal, 0);
  return {
    channel: "web",
    status: "paid",
    orderType,
    items: safe,
    totals: { subtotal: total, total },
    created_at: new Date().toISOString(),
  };
}

// ---------- Network ----------
async function postJsonWithTimeout(url, body, timeoutMs = 4000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = {};
    try { json = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok) {
      const msg = json?.error || json?.message || `HTTP ${res.status} - ${text}`;
      throw new Error(msg);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

export async function submitOrder(payload, timeoutMs = 4000) {
  const localPaths = ["/pedidos", "/api/pedidos", "/orders", "/api/orders"];
  // 1) mismo origen (con proxy de Vite)
  for (const p of localPaths) {
    try { return await postJsonWithTimeout(p, payload, timeoutMs); } catch {}
  }
  // 2) Fallback directo al backend si hay BACK_ORIGIN
  if (BACK_ORIGIN) {
    for (const p of localPaths) {
      try { return await postJsonWithTimeout(`${BACK_ORIGIN}${p}`, payload, timeoutMs); } catch {}
    }
  }
  throw new Error("No se pudo comunicar con el backend.");
}

// ---------- Outbox (opcional, no bloquea la UI) ----------
function readOutbox() {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function writeOutbox(arr) {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(arr || [])); } catch {}
}
function queueOrder(payload) {
  const box = readOutbox();
  box.push(payload);
  writeOutbox(box);
}

export async function flushOutbox(timeoutMs = 4000) {
  const box = readOutbox();
  if (box.length === 0) return { flushed: 0 };
  const remaining = [];
  let ok = 0;
  for (const p of box) {
    try { await submitOrder(p, timeoutMs); ok++; } catch { remaining.push(p); }
  }
  writeOutbox(remaining);
  return { flushed: ok, pending: remaining.length };
}

// ---------- API principal para la pantalla ----------
export async function submitOrderFromLocalStorageOptimistic(timeoutMs = 4000) {
  const items = readCartLS();
  const orderType = localStorage.getItem("orderType") || "comer-aca";
  const payload = buildOrderPayload(items, orderType);
  try {
    await submitOrder(payload, timeoutMs);
    return { ok: true, queued: false };
  } catch {
    queueOrder(payload); // guardamos para reintentar luego
    return { ok: false, queued: true };
  }
}
