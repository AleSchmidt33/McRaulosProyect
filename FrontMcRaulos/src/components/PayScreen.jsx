// src/components/PayScreen.jsx
import React, { useMemo, useState, useEffect } from "react";
import { getLastOrder } from "../lib/order";
import { readCart } from "../lib/cart";

function currency(n) {
  try { return new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(n||0); }
  catch { return `$ ${Number(n||0).toFixed(2)}`; }
}

const METHODS = [
  { id: "cash", label: "Efectivo", icon: "💵" },
  { id: "card", label: "Tarjeta",  icon: "💳" },
  { id: "qr",   label: "QR",       icon: "🧾" },
];

export default function PayScreen({ onBack }) {
  const [last, setLast] = useState(() => getLastOrder());
  const [method, setMethod] = useState("cash");

  // por si se guardó en otra pestaña
  useEffect(() => {
    const i = setInterval(() => setLast(getLastOrder()), 800);
    return () => clearInterval(i);
  }, []);

  // tu back: { status, message, data: { pedido, pago, detalles, ... } }
  const pedido   = last?.data?.pedido || null;
  const pago     = last?.data?.pago   || null;
  const detalles = last?.data?.detalles || [];

  // fallback si no hay respuesta guardada: calcular desde carrito
  const fallbackTotal = useMemo(() => {
    try {
      const items = readCart();
      return items.reduce((acc, it) => acc + (Number(it.precio)||Number(it.price)||0)*(Number(it.qty)||0), 0);
    } catch { return 0; }
  }, []);

  const total = pedido?.total ?? pago?.monto ?? fallbackTotal;

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-3xl shadow-xl border p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center text-lg">💳</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Ir a pagar</h1>
              {pedido?.id_pedido && (
                <p className="text-sm text-gray-600">
                  Pedido <span className="font-semibold">#{pedido.id_pedido}</span>
                </p>
              )}
            </div>
          </div>

          {/* Resumen */}
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <div className="rounded-xl border p-4">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-2xl font-bold">{currency(total)}</div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="text-sm text-gray-600">Productos</div>
              <div className="text-2xl font-bold">{Array.isArray(detalles) ? detalles.length : "—"}</div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="text-sm text-gray-600">Modalidad</div>
              <div className="text-2xl font-bold">
                {pedido?.id_tipo_pedido === 2 ? "Para llevar" : "Comer acá"}
              </div>
            </div>
          </div>

          {/* Detalle rápido */}
          {Array.isArray(detalles) && detalles.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold">Detalle</h3>
              <ul className="divide-y">
                {detalles.map((d) => (
                  <li key={d.id_detalle_pedido} className="py-2 flex items-center justify-between">
                    <span className="text-sm text-gray-700">Producto #{d.id_producto}</span>
                    <span className="text-sm font-medium">{currency(Number(d.subtotal))}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Métodos de pago */}
          <div className="mt-6">
            <p className="text-sm font-semibold mb-2">Método de pago</p>
            <div className="grid grid-cols-3 gap-3">
              {METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`rounded-xl border p-4 text-left ${method===m.id ? "bg-red-600 text-white border-red-600" : "bg-white"}`}
                >
                  <div className="text-2xl">{m.icon}</div>
                  <div className="mt-1 font-semibold">{m.label}</div>
                  {method===m.id && <div className="text-xs opacity-80">Seleccionado</div>}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-xl border p-4 bg-gray-50">
              {method === "cash" && (
                <div className="text-sm">
                  Pagás en caja. Total: <span className="font-bold">{currency(total)}</span>.
                </div>
              )}
              {method === "card" && (
                <div className="text-sm">
                  Presentá la tarjeta en caja/pos. Total: <span className="font-bold">{currency(total)}</span>.
                </div>
              )}
              {method === "qr" && (
                <div className="text-sm">
                  Mostrá/escaneá el QR del local. Total: <span className="font-bold">{currency(total)}</span>.
                </div>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="mt-6 flex items-center gap-2">
            <button onClick={onBack} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800">
              Volver
            </button>
            <button className="ml-auto px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700">
              Confirmar pago
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
