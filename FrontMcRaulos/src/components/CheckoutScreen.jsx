// src/components/CheckoutScreen.jsx
import { useEffect, useMemo, useState } from "react";
import { readCart, subtotal } from "../lib/cart";

export default function CheckoutScreen({ onBack, onPay }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const sync = () => setItems(readCart());
    sync();
    window.addEventListener("cart:update", sync);
    return () => window.removeEventListener("cart:update", sync);
  }, []);

  const orderType = localStorage.getItem("orderType") || "comer-aca";
  const typeLabel = orderType === "comer-aca" ? "Comer acá" : "Para llevar";
  const total = useMemo(() => subtotal(), [items]);

  const currency = (n) =>
    Number(n).toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    });

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

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Encabezado */}
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-xl border border-white/40 p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-lg">🧾</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Resumen del pedido</h1>
              <div className="text-gray-600">Modalidad: <span className="font-semibold">{typeLabel}</span></div>
            </div>
            <button onClick={onBack} className="ml-auto px-4 py-2 rounded-xl bg-gray-700 text-white hover:bg-gray-800">
              Volver al menú
            </button>
          </div>
        </div>

        {/* Detalle de ítems */}
        <div className="bg-white/90 backdrop-blur rounded-3xl shadow border border-white/40 p-4">
          {items.length === 0 ? (
            <div className="text-gray-600 bg-gray-50 border rounded-xl p-4">
              No hay ítems en el carrito.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((it) => {
                const lineTotal = (Number(it.precio) || 0) * (Number(it.qty) || 0);
                return (
                  <li key={it.uid ?? it.id} className="py-4 flex items-start gap-4">
                    {it.imagen ? (
                      <img src={it.imagen} alt={it.nombre} className="w-16 h-16 rounded-lg object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-yellow-100 flex items-center justify-center text-2xl">🍔</div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start">
                        <div className="font-semibold text-gray-900 truncate">{it.nombre}</div>
                        <div className="ml-auto text-gray-700">
                          {currency(it.precio)} × {it.qty} = <span className="font-semibold">{currency(lineTotal)}</span>
                        </div>
                      </div>
                      {renderCustom(it)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Totales */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <div className="text-gray-700 font-medium">Subtotal</div>
            <div className="text-lg font-bold">
              {Number(total).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })}
            </div>
          </div>

          {/* Acciones */}
          <div className="mt-4 flex gap-2">
            <button onClick={onBack} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200">
              Seguir editando
            </button>
            <button
              onClick={onPay}
              className="ml-auto px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
            >
              Ir a pagar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
