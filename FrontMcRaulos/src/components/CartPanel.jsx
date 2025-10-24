// src/components/CartPanel.jsx
import { useEffect, useMemo, useState, useCallback } from "react";

const CART_KEY = "mcraulos_cart_v1";

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items || []));
    // notificar por si otras pantallas escuchan
    window.dispatchEvent(new Event("cart:update"));
  } catch {}
}

// 👉 Junta modificaciones desde distintos formatos (extras/removidos/custom.ingredients)
function getMods(it) {
  const extras = [];
  const removed = [];

  // extras/removidos planos
  if (Array.isArray(it?.extras)) {
    for (const ex of it.extras) {
      const name = ex?.nombre ?? ex?.name ?? ex;
      const qty = Number(ex?.qty ?? 1);
      if (name && qty > 0) extras.push(qty > 1 ? `${name} x${qty}` : `${name}`);
    }
  }
  if (Array.isArray(it?.removidos)) {
    for (const rm of it.removidos) {
      const name = rm?.nombre ?? rm?.name ?? rm;
      if (name) removed.push(`${name}`);
    }
  }

  // custom.ingredients con qty: 0 -> removido, >1 -> extra
  const ings = it?.custom?.ingredients;
  if (Array.isArray(ings)) {
    for (const ing of ings) {
      const name = ing?.nombre ?? ing?.name ?? ing?.label ?? "";
      const qty = Number(ing?.qty);
      if (!name) continue;
      if (qty === 0) removed.push(name);
      else if (qty > 1) extras.push(`${name} x${qty}`);
    }
  }

  // De-duplicar manteniendo orden
  const dedup = (arr) => [...new Set(arr.filter(Boolean))];
  return {
    extras: dedup(extras),
    removed: dedup(removed),
    hasChanges: extras.length > 0 || removed.length > 0,
  };
}

export default function CartPanel({ open, onClose, onFinish }) {
  const [items, setItems] = useState(() => readCart());

  // Refrescar al abrir y en cambios de storage
  useEffect(() => {
    if (open) setItems(readCart());
  }, [open]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === CART_KEY) setItems(readCart());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Acciones
  const increase = useCallback((idx) => {
    setItems((prev) => {
      const copy = [...prev];
      const cur = copy[idx] ?? {};
      copy[idx] = { ...cur, qty: Math.max(1, Number(cur?.qty || 1) + 1) };
      writeCart(copy);
      return copy;
    });
  }, []);

  const decrease = useCallback((idx) => {
    setItems((prev) => {
      const copy = [...prev];
      const cur = copy[idx] ?? {};
      copy[idx] = { ...cur, qty: Math.max(1, Number(cur?.qty || 1) - 1) };
      writeCart(copy);
      return copy;
    });
  }, []);

  const removeAt = useCallback((idx) => {
    setItems((prev) => {
      const copy = prev.filter((_, i) => i !== idx);
      writeCart(copy);
      return copy;
    });
  }, []);

  const clearAll = useCallback(() => {
    writeCart([]);
    setItems([]);
  }, []);

  const total = useMemo(() => {
    return items.reduce((acc, it) => {
      const price = Number(it?.precio ?? it?.price ?? 0);
      const qty = Number(it?.qty ?? 1);
      return acc + price * qty;
    }, 0);
  }, [items]);

  const canFinish = items.length > 0;

  const handleFinish = useCallback(() => {
    if (!canFinish) return;
    writeCart(items); // snapshot por si la siguiente pantalla lo necesita
    try { onFinish?.(); } catch (e) { console.error(e); }
  }, [canFinish, items, onFinish]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          "fixed inset-0 transition-opacity",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          "bg-black/40",
          "z-[110]",
        ].join(" ")}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={[
          "fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl",
          "transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
          "z-[120] flex flex-col",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">Tu pedido</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 border hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-gray-600">El carrito está vacío.</div>
          ) : (
            items.map((it, idx) => {
              const price = Number(it?.precio ?? it?.price ?? 0);
              const qty = Number(it?.qty ?? 1);
              const lineTotal = price * qty;
              const mods = getMods(it);

              return (
                <div key={idx} className="border rounded-xl p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="font-semibold">
                        {it?.nombre ?? it?.name ?? "Producto"}
                      </div>
                      <div className="text-sm text-gray-600">
                        {price.toLocaleString("es-AR", {
                          style: "currency",
                          currency: "ARS",
                          maximumFractionDigits: 0,
                        })}{" "}
                        × {qty} ={" "}
                        <span className="font-semibold">
                          {lineTotal.toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>

                      {/* 🔻 Bloque de modificaciones: debajo y separado */}
                      {mods.hasChanges && (
                        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            Modificaciones
                          </div>

                          {mods.removed.length > 0 && (
                            <div className="text-xs text-gray-700">
                              <span className="font-medium">− Sin:</span>{" "}
                              {mods.removed.join(", ")}
                            </div>
                          )}
                          {mods.extras.length > 0 && (
                            <div className="text-xs text-gray-700">
                              <span className="font-medium">＋ Extra:</span>{" "}
                              {mods.extras.join(", ")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Controles */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          className="px-2 py-1 rounded-lg border hover:bg-gray-50"
                          onClick={() => decrease(idx)}
                          aria-label="Disminuir"
                        >
                          −
                        </button>
                        <span className="min-w-6 text-center">{qty}</span>
                        <button
                          className="px-2 py-1 rounded-lg border hover:bg-gray-50"
                          onClick={() => increase(idx)}
                          aria-label="Aumentar"
                        >
                          ＋
                        </button>
                      </div>
                      <button
                        className="px-2 py-1 text-sm rounded-lg border hover:bg-gray-50"
                        onClick={() => removeAt(idx)}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-700">Total</span>
            <span className="text-lg font-bold">
              {total.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearAll}
              className="w-1/3 px-4 py-3 rounded-xl border hover:bg-gray-50"
            >
              Vaciar
            </button>
            <button
              id="finish-order-btn"
              onClick={handleFinish}
              disabled={!canFinish}
              className={[
                "w-2/3 px-4 py-3 rounded-xl text-white font-semibold",
                canFinish ? "bg-red-600 hover:bg-red-700" : "bg-gray-300 cursor-not-allowed",
              ].join(" ")}
            >
              Terminar pedido
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
