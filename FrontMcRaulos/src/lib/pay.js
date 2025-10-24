// src/lib/pay.js
export const BACK_ORIGIN =
  import.meta.env.VITE_BACK_ORIGIN || window.__BACK_ORIGIN__ || "";

async function postJson(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : {}; } catch {}
  if (!res.ok) {
    const msg = json?.error || json?.message || `HTTP ${res.status} - ${text}`;
    throw new Error(msg);
  }
  return json ?? {};
}

function extractPayUrl(json) {
  return (
    json?.init_point ||
    json?.sandbox_init_point ||
    json?.url ||
    json?.data?.init_point ||
    json?.data?.sandbox_init_point ||
    json?.data?.url ||
    null
  );
}

export function buildMpPayload(items = [], orderType = "comer-aca") {
  const mpItems = items.map((it) => ({
    title: String(it?.nombre ?? it?.name ?? "Producto"),
    quantity: Number(it?.qty ?? 1),
    unit_price: Number(it?.precio ?? it?.price ?? 0),
    currency_id: "ARS",
  }));
  const total = mpItems.reduce((a, i) => a + i.quantity * i.unit_price, 0);
  const backUrl = location.origin;
  return {
    items: mpItems,
    orderType,
    total,
    back_urls: {
      success: `${backUrl}/?pago=ok`,
      failure: `${backUrl}/?pago=fail`,
      pending: `${backUrl}/?pago=pending`,
    },
    auto_return: "approved",
  };
}

export async function createMpLink(payload) {
  // 1) mismo origen (si tenés proxy /mp en Vite)
  try {
    const j = await postJson("/mp/link", payload);
    const u = extractPayUrl(j);
    if (u) return u;
  } catch {}
  // 2) fallback directo al backend si definís VITE_BACK_ORIGIN
  if (BACK_ORIGIN) {
    const base = BACK_ORIGIN.replace(/\/$/, "");
    const j2 = await postJson(`${base}/mp/link`, payload);
    const u2 = extractPayUrl(j2);
    if (u2) return u2;
  }
  throw new Error("No se pudo obtener el link de pago.");
}
