// src/components/CheckoutScreen.jsx
import { useEffect, useState, useMemo } from "react";
import { readCart, getCartTotal, getCartCount } from "../lib/cart";
import { goTo } from "../lib/navbus";

/* ========== Helpers de agrupación (solo visual, no tocan el storage) ========== */
const isPlainItem = (item) => {
  // Consideramos "simple" si NO trae modificaciones
  // En tu estructura las mods viven en custom.ingredients con qty != 1
  const mods = item?.custom?.ingredients ?? [];
  const hasMods = Array.isArray(mods) && mods.some((ing) => Number(ing?.qty ?? 1) !== 1);

  // Extras / removidos en otras claves (por compat)
  const extras =
    item?.extras ?? item?.custom?.extras ?? item?.modificaciones ?? [];
  const removed =
    item?.removed ?? item?.custom?.removed ?? item?.quitados ?? [];
  const notes = item?.notas ?? item?.nota ?? "";

  const hasExtras =
    Array.isArray(extras) ? extras.length > 0 : !!extras && Object.keys(extras).length > 0;
  const hasRemoved =
    Array.isArray(removed) ? removed.length > 0 : !!removed && Object.keys(removed).length > 0;
  const hasNotes = typeof notes === "string" ? notes.trim().length > 0 : !!notes;

  return !hasMods && !hasExtras && !hasRemoved && !hasNotes;
};

const buildDisplayItems = (items) => {
  const out = [];
  const indexByKey = Object.create(null);

  (items || []).forEach((it, idx) => {
    const idProd = it?.producto?.id ?? it?.id ?? it?.productId ?? it?.producto_id;
    // Precio unitario (fallback a subtotal/qty si hace falta)
    const unitPrice =
      Number(it?.precio ?? it?.producto?.precio ?? it?.unitario ?? 0) ||
      (Number(it?.subtotal ?? 0) / Math.max(1, Number(it?.qty ?? 1)));

    const qty = Number(it?.qty ?? 1);

    if (isPlainItem(it) && idProd != null) {
      const key = `plain|${idProd}|${unitPrice}`;
      const found = indexByKey[key];
      if (found != null) {
        out[found].qty += qty;
        // subtotal recalculado para que el render sea correcto
        out[found].subtotal = unitPrice * out[found].qty;
      } else {
        indexByKey[key] = out.length;
        out.push({
          ...it,
          qty,
          subtotal: unitPrice * qty,
          groupKey: key,
        });
      }
    } else {
      // Con modificaciones: no se agrupa
      const sub =
        Number(it?.subtotal ?? 0) ||
        unitPrice * qty;
      out.push({ ...it, qty, subtotal: sub, groupKey: null });
    }
  });

  return out;
};
/* ============================================================================== */

export default function CheckoutScreen() {
  const [items, setItems] = useState([]);

  // Cargar y escuchar cambios del carrito
  useEffect(() => {
    const load = () => setItems(readCart());
    load();
    const h = () => load();
    window.addEventListener("mcraulos:cart-changed", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("mcraulos:cart-changed", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  const total = useMemo(() => getCartTotal(), [items]);
  const count = useMemo(() => getCartCount(), [items]);

  // 👉 Agrupado para render (igual que en el panel del carrito)
  const displayItems = useMemo(() => buildDisplayItems(items), [items]);

  const goPay = () => goTo("/pay");
  const seguirEditando = () => goTo("/menu");

  return (
    <div className="mx-auto max-w-6xl p-8">
      {/* CARD: Título + único botón Seguir editando (look "Volver") */}
      <div className="mb-8 rounded-2xl border bg-white/90 p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Resumen de tu pedido</h1>
            <p className="mt-1 text-base text-gray-600">Productos: {count}</p>
          </div>
          <button
            className="rounded-2xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-800 shadow-sm hover:bg-gray-100 active:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
            onClick={seguirEditando}
            aria-label="Volver al menú para seguir editando"
          >
            Seguir editando
          </button>
        </div>
      </div>

      {/* Layout: listado único a la izquierda, total a la derecha */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* CARD ÚNICA: listado de items */}
        <div className="xl:col-span-2">
          {displayItems.length === 0 ? (
            <div className="rounded-2xl border bg-white/90 p-10 text-center text-lg text-gray-600 shadow-sm backdrop-blur-sm">
              Tu carrito está vacío.
            </div>
          ) : (
            <div className="rounded-2xl border bg-white/95 p-6 shadow-md backdrop-blur">
              <ul className="divide-y divide-gray-200">
                {displayItems.map((it, idx) => (
                  <li key={it.groupKey ?? it.uid ?? idx} className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Nombre + chips */}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-lg font-semibold">
                          {it.nombre}
                        </div>

                        {/* Chips de modificaciones debajo (solo si hay) */}
                        {Array.isArray(it?.custom?.ingredients) &&
                          it.custom.ingredients.some((ing) => Number(ing?.qty ?? 1) !== 1) && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {it.custom.ingredients.map((ing) => {
                                const q = Number(ing.qty || 1);
                                if (q === 1) return null;
                                if (q === 0) {
                                  return (
                                    <span
                                      key={ing.id}
                                      className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700"
                                    >
                                      − Sin {ing.nombre}
                                    </span>
                                  );
                                }
                                return (
                                  <span
                                    key={ing.id}
                                    className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700"
                                  >
                                    ＋ Extra {ing.nombre}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                      </div>

                      {/* Cantidad + subtotal */}
                      <div className="text-right">
                        <div className="text-base text-gray-500">x{it.qty}</div>
                        <div className="text-lg font-semibold">
                          ${Number(it.subtotal || 0).toLocaleString("es-AR")}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Card de Total */}
        <div>
          <div className="rounded-2xl border bg-white/90 p-6 shadow-md backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xl text-gray-700">Total</span>
              <span className="text-3xl font-bold text-gray-900">
                ${Number(total).toLocaleString("es-AR")}
              </span>
            </div>
            <button
              className="w-full rounded-2xl bg-red-600 px-7 py-3 text-lg font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              onClick={goPay}
              disabled={displayItems.length === 0}
            >
              Ir a pagar
            </button>
            <p className="mt-3 text-xs text-gray-500">
              Revisá tu pedido antes de continuar al pago.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
