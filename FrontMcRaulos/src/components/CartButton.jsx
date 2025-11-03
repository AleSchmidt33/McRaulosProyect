// src/components/CartButton.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import * as cartLib from "../lib/cart";

// Helpers de acceso seguro
const readCartFn = typeof cartLib.readCart === "function" ? cartLib.readCart : null;
const countItemsFn = typeof cartLib.countItems === "function" ? cartLib.countItems : null;

// Normaliza la cantidad desde diferentes claves
function getItemQty(it) {
  const v = it?.qty ?? it?.cantidad ?? it?.quantity ?? it?.cant ?? 1;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default function CartButton({ onClick, className = "" }) {
  const location = useLocation();

  // Rutas donde escondemos el botón (manteniendo orden de hooks)
  const HIDE_ON = useMemo(() => new Set(["/checkout", "/pay", "/pago"]), []);
  const hidden = useMemo(() => HIDE_ON.has(location.pathname), [HIDE_ON, location.pathname]);

  // Conteo robusto: usa countItems() si existe; si no, suma cantidades del carrito
  const safeCount = useCallback(() => {
    try {
      if (countItemsFn) {
        const k = Number(countItemsFn());
        if (Number.isFinite(k)) return k;
      }
      if (readCartFn) {
        const items = readCartFn() || [];
        return items.reduce((acc, it) => acc + getItemQty(it), 0);
      }
    } catch {}
    return 0;
  }, []);

  const [count, setCount] = useState(() => safeCount());

  useEffect(() => {
    const refresh = () => setCount(safeCount());
    refresh();

    window.addEventListener("cart:update", refresh);
    window.addEventListener("mcraulos:cart-updated", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("cart:update", refresh);
      window.removeEventListener("mcraulos:cart-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [safeCount]);

  const handleOpen = () => {
    if (typeof onClick === "function") {
      onClick();
      return;
    }
    // Fallbacks compatibles con tu proyecto
    try { window.dispatchEvent(new Event("cart:open")); } catch {}
    try { window.dispatchEvent(new Event("cart:toggle")); } catch {}
    try { window.dispatchEvent(new Event("mcraulos:cart-open")); } catch {}
    try { window.dispatchEvent(new Event("mcraulos:cart-toggle")); } catch {}
  };

  if (hidden) return null;

  return (
    <button
      type="button"
      onClick={handleOpen}
      aria-label="Abrir carrito"
      className={[
        "fixed right-4 bottom-4 z-50",
        "rounded-full px-5 py-3 font-semibold",
        "bg-yellow-400 text-gray-900 border border-yellow-300 shadow-xl",
        "hover:bg-yellow-500 active:scale-95 transition",
        "flex items-center gap-2",
        className
      ].join(" ")}
    >
      <span className="text-lg">🛒</span>
      <span>Carrito</span>
      <span
        className={[
          "ml-1 min-w-6 h-6 px-2",
          "inline-flex items-center justify-center",
          "rounded-full text-sm font-bold",
          "bg-white text-gray-900 border border-yellow-300"
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}
