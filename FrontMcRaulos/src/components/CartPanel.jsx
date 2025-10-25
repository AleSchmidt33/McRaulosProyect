import { useEffect, useMemo, useState } from "react";
import {
  readCart,
  updateQty,
  removeItem,
  clearCart,
  getCartTotal,
} from "../lib/cart";
import { goTo } from "../lib/navbus";

export default function CartPanel({ open, onClose }) {
  const [items, setItems] = useState([]);

  // Carga / escucha cambios del carrito
  useEffect(() => {
    const load = () => setItems(readCart());
    load();
    const handler = () => load();
    window.addEventListener("storage", handler);
    window.addEventListener("mcraulos:cart-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("mcraulos:cart-changed", handler);
    };
  }, []);

  // Ocultar botón carrito cuando el panel está abierto
  useEffect(() => {
    const cls = "cart-open";
    const flag = typeof open === "boolean" ? open : true;
    if (flag) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [open]);

  const total = useMemo(() => getCartTotal(), [items]);

  const onInc = (uid) => {
    const item = items.find((x) => x.uid === uid);
    if (!item) return;
    updateQty(uid, Number(item.qty || 1) + 1);
    setItems(readCart());
  };

  const onDec = (uid) => {
    const item = items.find((x) => x.uid === uid);
    if (!item) return;
    const next = Math.max(1, Number(item.qty || 1) - 1);
    updateQty(uid, next);
    setItems(readCart());
  };

  const onRemove = (uid) => {
    removeItem(uid);
    setItems(readCart());
  };

  const onClear = () => {
    clearCart();
    setItems(readCart());
  };

  // 👇 ESTE es el “terminar pedido”
  const goCheckout = () => {
    onClose?.();                 // cierra el panel
    setTimeout(() => goTo("/checkout"), 0);  // navega al resumen
  };

  return (
    <div className={`fixed inset-0 z-[9998] ${open ? "block" : "hidden"}`} aria-hidden={!open}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={() => onClose?.()} />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-[480px] overflow-hidden rounded-l-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-semibold">Tu pedido</h3>
          <button
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            onClick={() => onClose?.()}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Lista */}
        <div className="flex h-[calc(100%-180px)] flex-col gap-3 overflow-y-auto px-5 py-4">
          {items.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-500">
              Aún no agregaste productos.
            </div>
          )}

          {items.map((it) => (
            <div key={it.uid} className="rounded-2xl border px-4 py-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{it.nombre}</div>
                  {it?.custom?.ingredients?.length > 0 && (
                    <ul className="mt-1 text-xs text-gray-600">
                      {it.custom.ingredients.map((ing) => {
                        const q = Number(ing.qty || 1);
                        if (q === 1) return null;
                        if (q === 0) return <li key={ing.id}>− Sin {ing.nombre}</li>;
                        return <li key={ing.id}>＋ Extra {ing.nombre}</li>;
                      })}
                    </ul>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    ${Number(it.subtotal || 0).toLocaleString("es-AR")}
                  </div>
                </div>
              </div>

              {/* Controles */}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    className="h-8 w-8 rounded-full border text-lg leading-8 hover:bg-gray-50"
                    onClick={() => onDec(it.uid)}
                  >
                    −
                  </button>
                  <div className="min-w-[2.5rem] text-center text-sm font-medium">
                    {it.qty}
                  </div>
                  <button
                    className="h-8 w-8 rounded-full border text-lg leading-8 hover:bg-gray-50"
                    onClick={() => onInc(it.uid)}
                  >
                    +
                  </button>
                </div>

                <button
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200"
                  onClick={() => onRemove(it.uid)}
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">Total</span>
            <span className="text-lg font-semibold">
              ${Number(total).toLocaleString("es-AR")}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
              onClick={onClear}
            >
              Vaciar
            </button>
            {/* 👇 Botón “Terminar pedido” usa goCheckout */}
            <button
              className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              onClick={goCheckout}
              disabled={items.length === 0}
            >
              Terminar pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
