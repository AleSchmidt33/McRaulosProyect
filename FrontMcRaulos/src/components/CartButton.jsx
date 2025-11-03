// src/components/CartButton.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { readCart as readCartExport } from "../lib/cart";

const LS_KEY = "mcraulos_cart_v1";

function getQty(it) {
  const v = it?.qty ?? it?.cantidad ?? it?.quantity ?? it?.cant ?? 1;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function getCartItemsSafe() {
  try {
    if (typeof readCartExport === "function") {
      const c = readCartExport();
      if (Array.isArray(c)) return c;
      if (c && Array.isArray(c.items)) return c.items;
    }
  } catch {}
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
  } catch {}
  return [];
}

export default function CartButton({ onClick, className = "" }) {
  const location = useLocation();

  const HIDE_ON = useMemo(() => new Set(["/checkout", "/pay", "/pago"]), []);
  const hidden = useMemo(() => HIDE_ON.has(location.pathname), [HIDE_ON, location.pathname]);

  const computeCount = useCallback(() => {
    try {
      const items = getCartItemsSafe();
      return items.reduce((acc, it) => acc + getQty(it), 0);
    } catch {
      return 0;
    }
  }, []);

  const [count, setCount] = useState(() => computeCount());
  const lastCountRef = useRef(count);

  useEffect(() => {
    const refresh = () => {
      const k = computeCount();
      if (k !== lastCountRef.current) {
        lastCountRef.current = k;
        setCount(k);
      }
    };

    // 1) Refresco inmediato
    refresh();

    // 2) Eventos “propios” del proyecto
    const onUpdate = () => refresh();
    window.addEventListener("cart:update", onUpdate);
    window.addEventListener("cart:changed", onUpdate);
    window.addEventListener("mcraulos:cart-updated", onUpdate);

    // 3) Eventos del navegador útiles
    window.addEventListener("visibilitychange", onUpdate);
    window.addEventListener("focus", onUpdate);

    // 4) Polling suave como red de seguridad (cada 400 ms)
    const iv = setInterval(refresh, 400);

    return () => {
      window.removeEventListener("cart:update", onUpdate);
      window.removeEventListener("cart:changed", onUpdate);
      window.removeEventListener("mcraulos:cart-updated", onUpdate);
      window.removeEventListener("visibilitychange", onUpdate);
      window.removeEventListener("focus", onUpdate);
      clearInterval(iv);
    };
  }, [computeCount]);

  const handleOpen = () => {
    if (typeof onClick === "function") return onClick();
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
        className,
      ].join(" ")}
    >
      <span className="text-lg">🛒</span>
      <span>Carrito</span>
      <span
        className={[
          "ml-1 min-w-6 h-6 px-2",
          "inline-flex items-center justify-center",
          "rounded-full text-sm font-bold",
          "bg-white text-gray-900 border border-yellow-300",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}