// src/components/CartPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";

/* ======================= CONFIG STORAGE (si no pasan items por props) ======================= */
const CART_KEY = "mcraulos_cart_v1";
const readCart = () => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const writeCart = (items) => {
  localStorage.setItem(CART_KEY, JSON.stringify(items ?? []));
  window.dispatchEvent(new CustomEvent("cart:updated"));
};

/* ======================= AGRUPADO SOLO VISUAL (no toca storage) ======================= */
const isPlainItem = (item) => {
  const extras = item?.extras ?? item?.custom?.extras ?? item?.modificaciones ?? [];
  const removed = item?.removed ?? item?.custom?.removed ?? item?.quitados ?? [];
  const notes = item?.notas ?? item?.nota ?? "";

  const hasExtras  = Array.isArray(extras)  ? extras.length  > 0 : !!extras && Object.keys(extras).length  > 0;
  const hasRemoved = Array.isArray(removed) ? removed.length > 0 : !!removed && Object.keys(removed).length > 0;
  const hasNotes   = typeof notes === "string" ? notes.trim().length > 0 : !!notes;

  return !hasExtras && !hasRemoved && !hasNotes;
};

const buildDisplayItems = (items) => {
  const out = [];
  const indexByKey = Object.create(null);

  (items || []).forEach((it, idx) => {
    const idProd = it?.producto?.id ?? it?.id ?? it?.productId ?? it?.producto_id;
    const price  = Number(it?.precio ?? it?.producto?.precio ?? 0);
    const qty    = Number(it?.qty ?? 1);

    if (isPlainItem(it) && idProd != null) {
      const key = `plain|${idProd}|${price}`;
      const found = indexByKey[key];
      if (found != null) {
        out[found].qty += qty;
        out[found].backingIndexes.push(idx);
      } else {
        indexByKey[key] = out.length;
        out.push({ ...it, qty, groupKey: key, backingIndexes: [idx] });
      }
    } else {
      out.push({ ...it, qty, groupKey: null, backingIndexes: [idx] });
    }
  });

  return out;
};

const firstIndexOf = (dispItem) => dispItem.backingIndexes[0]; // para +
const lastIndexOf  = (dispItem) => dispItem.backingIndexes[dispItem.backingIndexes.length - 1]; // para −

/* ================ Ocultar botón de carrito con exclusión del panel ================ */
const HIDE_CART_SELECTORS = [
  ".cart-fab",
  "#cart-btn",
  ".CartButton",
  ".cart-button",
  "#CartButton",
  '[data-cart-button="true"]',
  "button.fixed.right-4.bottom-4",
  "a.fixed.right-4.bottom-4",
].join(",");

const norm = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function hideCartButtons(panelEl) {
  const restored = new Set();

  const shouldSkip = (el) => {
    if (!panelEl) return false;
    // no tocar nada que sea el panel, esté dentro del panel o contenga al panel
    return el === panelEl || el.contains(panelEl) || panelEl.contains(el);
  };

  const hideEl = (el) => {
    if (!el || restored.has(el) || shouldSkip(el)) return;
    const prev = {
      display: el.style.display,
      pointerEvents: el.style.pointerEvents,
      visibility: el.style.visibility,
      opacity: el.style.opacity,
    };
    el.dataset._cartPrev = JSON.stringify(prev);
    el.style.display = "none";
    el.style.pointerEvents = "none";
    el.style.visibility = "hidden";
    el.style.opacity = "0";
    restored.add(el);
  };

  // 1) por selectores conocidos / posición típica
  if (HIDE_CART_SELECTORS) {
    document.querySelectorAll(HIDE_CART_SELECTORS).forEach(hideEl);
  }

  // 2) por TEXTO “carrito” pero SOLO si es button/a y está fijo o sticky
  const candidates = document.querySelectorAll("button, a");
  candidates.forEach((el) => {
    if (restored.has(el) || shouldSkip(el)) return;
    const t = norm(el.textContent || "");
    if (!t.includes("carrito")) return;
    const pos = window.getComputedStyle(el).position;
    if (pos === "fixed" || pos === "sticky") hideEl(el);
  });

  // función de restauración al cerrar el panel
  return () => {
    restored.forEach((el) => {
      try {
        const prev = el.dataset._cartPrev ? JSON.parse(el.dataset._cartPrev) : {};
        el.style.display = prev.display ?? "";
        el.style.pointerEvents = prev.pointerEvents ?? "";
        el.style.visibility = prev.visibility ?? "";
        el.style.opacity = prev.opacity ?? "";
        delete el.dataset._cartPrev;
      } catch {}
    });
  };
}

/* ====================================== COMPONENTE ====================================== */
/**
 * Props compatibles:
 *  - Visibilidad: isOpen | open | visible | show | isCartOpen | opened
 *  - onClose()
 *  - items? (opcional). Si no lo pasás, el panel usa localStorage.
 *  - onAdd(index)?, onSub(index)?, onRemove(index)?, onClear()?, onGoCheckout? / onCheckout? / onPay? / onConfirm?
 */
export default function CartPanel(props) {
  const {
    onClose,
    onAdd,
    onSub,
    onRemove,
    onClear,
    onGoCheckout,
    onCheckout,
    onPay,
    onConfirm,
    items: itemsFromProps, // opcional
  } = props;

  const isVisible = !!(
    props.isOpen ??
    props.open ??
    props.visible ??
    props.show ??
    props.isCartOpen ??
    props.opened
  );

  // Ref del contenedor del panel (para no ocultar nada suyo ni sus padres)
  const panelRef = useRef(null);

  // Fuente de verdad de items (hooks siempre en el mismo orden)
  const [itemsLS, setItemsLS] = useState(() => (itemsFromProps ? [] : readCart()));
  useEffect(() => {
    if (itemsFromProps) return;
    const sync = () => setItemsLS(readCart());
    window.addEventListener("storage", sync);
    window.addEventListener("cart:updated", sync);
    if (isVisible) sync(); // refresca al abrir
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cart:updated", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsFromProps, isVisible]);

  // Ocultar botón Carrito SOLO cuando está visible (y sin tocar el panel)
  useEffect(() => {
    if (!isVisible) return;
    const restore = hideCartButtons(panelRef.current);
    return () => restore();
  }, [isVisible]);

  const items = itemsFromProps ?? itemsLS;

  const displayItems = useMemo(() => buildDisplayItems(items), [items]);

  const total = useMemo(() => {
    return (items || []).reduce((acc, it) => {
      const price = Number(it?.precio ?? it?.producto?.precio ?? 0);
      const qty = Number(it?.qty ?? 1);
      return acc + price * qty;
    }, 0);
  }, [items]);

  const doAdd = (idx) => {
    if (onAdd) return onAdd(idx);
    const arr = readCart();
    if (arr[idx]) {
      arr[idx].qty = Number(arr[idx].qty ?? 1) + 1;
      writeCart(arr);
      setItemsLS(arr);
    }
  };
  const doSub = (idx) => {
    if (onSub) return onSub(idx);
    const arr = readCart();
    if (arr[idx]) {
      const next = Number(arr[idx].qty ?? 1) - 1;
      if (next <= 0) arr.splice(idx, 1);
      else arr[idx].qty = next;
      writeCart(arr);
      setItemsLS(arr);
    }
  };
  const doRemove = (idx) => {
    if (onRemove) return onRemove(idx);
    const arr = readCart();
    if (arr[idx]) {
      arr.splice(idx, 1);
      writeCart(arr);
      setItemsLS(arr);
    }
  };
  const doClear = () => {
    if (onClear) return onClear();
    writeCart([]);
    setItemsLS([]);
  };

  const handleGoCheckout = () => {
    const handler = onGoCheckout || onCheckout || onPay || onConfirm || null;
    if (handler) {
      handler();
      onClose?.();
      return;
    }
    try {
      const href = String(window.location.href);
      if (href.includes("#")) window.location.hash = "#/checkout";
      else window.location.href = "/checkout";
    } catch {}
    onClose?.();
  };

  if (!isVisible) return null;

  /* ======================================== UI ======================================== */
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40">
      <div
        ref={panelRef}
        className="w-full max-w-[560px] h-full bg-white rounded-l-2xl shadow-xl flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Tu pedido</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {displayItems.length === 0 ? (
            <div className="text-gray-500 text-center py-20">Tu carrito está vacío.</div>
          ) : (
            displayItems.map((p, i) => {
              const nombre     = p?.nombre ?? p?.producto?.nombre ?? "Producto";
              const precioUnit = Number(p?.precio ?? p?.producto?.precio ?? 0);
              const subtotal   = precioUnit * Number(p.qty ?? 1);

              const showMods = !isPlainItem(p);
              const modsText = (() => {
                if (!showMods) return "";
                const extras  = p?.extras  ?? p?.custom?.extras  ?? p?.modificaciones ?? [];
                const removed = p?.removed ?? p?.custom?.removed ?? p?.quitados ?? [];
                const parts = [];
                if (Array.isArray(extras)  && extras.length)  parts.push(`＋ ${extras.map((e) => e?.nombre ?? e).join(", ")}`);
                if (Array.isArray(removed) && removed.length) parts.push(`− ${removed.map((r) => r?.nombre ?? r).join(", ")}`);
                return parts.join(" | ");
              })();

              const idxMas    = firstIndexOf(p);
              const idxMenos  = lastIndexOf(p);
              const idxQuitar = firstIndexOf(p);

              return (
                <div key={`${p.groupKey ?? "single"}-${i}`} className="border rounded-xl p-4 flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="font-semibold">{nombre}</div>
                        
                        {/* 🆕 Mostrar precio base si hay extras */}
                        {p.precioBase && p.precioExtras > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Base: ${Number(p.precioBase * p.qty).toLocaleString("es-AR")} 
                            + Extras: ${Number(p.precioExtras * p.qty).toLocaleString("es-AR")}
                          </div>
                        )}
                        
{/* 🧩 Mostrar ingredientes agregados o removidos */}
{(() => {
  const custom = p?.custom ?? p?.producto?.custom ?? {};
  const ingredients = custom?.ingredients ?? [];

  if (!Array.isArray(ingredients) || !ingredients.length) {
    // Fallback: si no hay ingredientes personalizados, mostrar modsText viejo
    return showMods && modsText ? (
      <div className="text-sm text-gray-500 mt-1">{modsText}</div>
    ) : null;
  }

  const hasMods = ingredients.some((ing) => Number(ing?.qty ?? 1) !== 1);
  if (!hasMods) {
    return showMods && modsText ? (
      <div className="text-sm text-gray-500 mt-1">{modsText}</div>
    ) : null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {ingredients.map((ing) => {
        const q = Number(ing.qty || 1);

        // Sin cambios → no mostrar
        if (q === 1) return null;

        // Ingrediente removido
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

        // Ingrediente extra
        const cantidadExtra = q - 1;
        const precioIng = Number(ing.precio || 0);
        return (
          <span
            key={ing.id}
            className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700"
          >
            ＋ Extra {ing.nombre}
            {precioIng > 0 &&
              ` (+$${(precioIng * cantidadExtra).toLocaleString("es-AR")})`}
          </span>
        );
      })}
    </div>
  );
})()}
                        
                        <div className="text-sm text-gray-500 mt-1">
                          Precio unitario: {precioUnit.toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </div>
                      </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => doSub(idxMenos)} className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-gray-50">−</button>
                      <span className="w-5 text-center">{p.qty}</span>
                      <button onClick={() => doAdd(idxMas)} className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-gray-50">+</button>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold">
                        {subtotal.toLocaleString("es-AR", {
                          style: "currency",
                          currency: "ARS",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </div>
                      <button onClick={() => doRemove(idxQuitar)} className="text-sm text-gray-500 hover:text-gray-700 mt-1">
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
        <div className="px-6 py-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-gray-600">Total</div>
            <div className="text-xl font-bold">
              {total.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={doClear} className="px-4 h-11 rounded-xl border bg-white hover:bg-gray-50">
              Vaciar
            </button>

            <button onClick={handleGoCheckout} className="flex-1 h-11 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700">
              Terminar pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
