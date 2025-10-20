// src/components/CartPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { readCart, setQty, removeItem, clearCart, subtotal } from "../lib/cart";

export default function CartPanel({ open, onClose, onFinish }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const sync = () => setItems(readCart());
    sync();
    window.addEventListener("cart:update", sync);
    return () => window.removeEventListener("cart:update", sync);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const total = useMemo(() => subtotal(), [items]);

  const currency = (n) =>
    Number(n).toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    });

  const inc = (it) => {
    const key = it.uid ?? it.id;
    const next = (Number(it?.qty) || 0) + 1;
    setQty(key, next);
  };

  const dec = (it) => {
    const key = it.uid ?? it.id;
    const next = Math.max(1, (Number(it?.qty) || 1) - 1);
    setQty(key, next);
  };

  const remove = (it) => {
    const key = it.uid ?? it.id;
    removeItem(key);
  };

  const renderCustom = (it) => {
    const ings = it.custom?.ingredients;
    if (!Array.isArray(ings) || ings.length === 0) return null;

    const removed = ings.filter((x) => Number(x.qty) === 0).map((x) => x.nombre);
    const extras = ings.filter((x) => Number(x.qty) > 1).map((x) => `${x.nombre} x${x.qty}`);

    if (removed.length === 0 && extras.length === 0) {
      return <div className="text-xs text-gray-500">Sin cambios</div>;
    }

    return (
      <div className="text-xs text-gray-600">
        {removed.length > 0 && <div>− Sin: {removed.join(", ")}</div>}
        {extras.length > 0 && <div>＋ Extra: {extras.join(", ")}</div>}
      </div>
    );
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-lg">🛒</div>
          <h2 className="text-xl font-semibold">Tu pedido</h2>
          <button onClick={onClose} className="ml-auto px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-gray-600 bg-gray-50 border rounded-xl p-4">
              Tu carrito está vacío.
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((it) => (
                <li key={it.uid ?? it.id} className="border rounded-xl p-3 flex items-center gap-3">
                  {it.imagen ? (
                    <img src={it.imagen} alt={it.nombre} className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-yellow-100 flex items-center justify-center text-2xl">🍔</div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{it.nombre}</div>
                    <div className="text-sm text-gray-600">{currency(it.precio)}</div>
                    {renderCustom(it)}
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => dec(it)} className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200">−</button>
                      <span className="w-8 text-center font-semibold">{it.qty}</span>
                      <button onClick={() => inc(it)} className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200">+</button>
                      <button onClick={() => remove(it)} className="ml-3 px-2 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-sm">
                        Quitar
                      </button>
                    </div>
                  </div>

                  <div className="text-right font-semibold">
                    {currency((Number(it.precio) || 0) * (Number(it.qty) || 0))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 border-t bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-700 font-medium">Subtotal</span>
            <span className="text-lg font-bold">
              {Number(total).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className="flex gap-2">
            <button onClick={() => clearCart()} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800">
              Vaciar
            </button>
            <button onClick={() => (onFinish ? onFinish() : onClose?.())} className="ml-auto px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700">
              Terminar pedido
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
