// src/components/CheckoutScreen.jsx
import React, { useEffect, useMemo, useState } from "react";
import { readCart, subtotal } from "../lib/cart";

function currency(n) {
  try { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n || 0); }
  catch { return `$ ${Number(n || 0).toFixed(2)}`; }
}

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

  const ItemRow = ({ it }) => {
    const nombre = it.nombre || it.name || it.titulo || `Producto ${it.id ?? ""}`;
    const cantidad = it.cantidad ?? it.qty ?? 1;
    const precioUnit = it.precio_unitario ?? it.precio ?? it.price ?? 0;
    const sub = it.subtotal ?? Number(precioUnit) * Number(cantidad);
    const tipo = it.tipo || it.type || it.categoria || "producto";
    const mods = it.modificaciones || it.edits;
    const extras = [];
    if (mods?.add?.length) extras.push(`+ ${mods.add.join(", ")}`);
    if (mods?.remove?.length) extras.push(`- ${mods.remove.join(", ")}`);

    return (
      <div className="py-3 flex items-start justify-between">
        <div>
          <div className="font-medium">
            {nombre} <span className="text-xs text-gray-500">×{cantidad}</span>
          </div>
          <div className="text-xs text-gray-500">{tipo}</div>
          {extras.length > 0 && <div className="text-xs mt-1">Modif.: {extras.join(" / ")}</div>}
        </div>
        <div className="text-right">
          <div className="text-sm">{currency(precioUnit)}</div>
          <div className="text-xs text-gray-500">Subtotal: {currency(sub)}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Encabezado */}
        <div className="bg-white/95 rounded-3xl shadow-xl border p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-lg">🧾</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Resumen del pedido</h1>
              <div className="text-sm">Modalidad: <span className="font-semibold">{typeLabel}</span></div>
            </div>
          </div>

          {/* Botones: Volver / Ir a pagar */}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800"
            >
              Volver
            </button>
            <button
              onClick={onPay}
              disabled={items.length === 0}
              className="ml-auto px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              Ir a pagar
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white/95 rounded-3xl shadow-xl border p-6">
          {items.length === 0 ? (
            <p className="text-sm text-gray-600">Tu carrito está vacío.</p>
          ) : (
            <>
              <div className="divide-y">
                {items.map((it, i) => <ItemRow key={i} it={it} />)}
              </div>
              <div className="mt-4 flex items-center justify-end">
                <div className="text-lg font-bold">Total: {currency(total)}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
