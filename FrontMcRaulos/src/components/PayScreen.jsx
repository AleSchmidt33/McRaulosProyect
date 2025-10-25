import { useEffect, useState } from "react";
import { clearCart, getCartTotal, getCartCount } from "../lib/cart";
import { goTo } from "../lib/navbus";

const METODOS = [
  { id: "tarjeta",  titulo: "Tarjeta",      desc: "Crédito o débito." , icon: "💳" },
  { id: "efectivo", titulo: "Efectivo",     desc: "Pagás al recibir." , icon: "💵" },
  { id: "mp",       titulo: "Mercado Pago", desc: "QR o link."        , icon: "🟦" },
];

export default function PayScreen() {
  const [showOK, setShowOK] = useState(false);
  const [metodo, setMetodo] = useState(null);

  const total = getCartTotal();
  const count = getCartCount();

  useEffect(() => {
    // por si quedó la clase del carrito
    document.body.classList.remove("cart-open");
  }, []);

  const confirmar = () => {
    if (!metodo) return;
    clearCart();
    setShowOK(true);
    setTimeout(() => goTo("/"), 1200);
  };

  return (
    <div className="mx-auto max-w-3xl p-8">
      {/* Título */}
      <div className="mb-8 rounded-2xl border bg-white/90 p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Métodos de pago</h1>
            <p className="mt-1 text-base text-gray-600">Productos: {count}</p>
          </div>
          <div className="text-xl">
            Total:{" "}
            <span className="text-2xl font-bold">
              ${Number(total).toLocaleString("es-AR")}
            </span>
          </div>
        </div>
      </div>

      {/* Cards apiladas */}
      <div className="flex flex-col gap-4">
        {METODOS.map((m) => {
          const selected = metodo === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetodo(m.id)}
              className={[
                "w-full rounded-2xl border bg-white/95 p-5 text-left shadow-md backdrop-blur",
                "transition outline-none",
                selected
                  ? "border-red-600 ring-2 ring-red-200"
                  : "hover:bg-white"
              ].join(" ")}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl leading-none">{m.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{m.titulo}</h3>
                    {/* radio visual */}
                    <span
                      className={[
                        "inline-block h-5 w-5 rounded-full border-2",
                        selected ? "border-red-600 bg-red-600" : "border-gray-300"
                      ].join(" ")}
                      aria-hidden
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{m.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA confirmar */}
      <div className="mt-6 rounded-2xl border bg-white/90 p-6 shadow-sm backdrop-blur-sm">
        <div className="mb-4 text-sm text-gray-600">
          Elegí un método y confirmá tu pago.
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-lg">
            Total a pagar:{" "}
            <span className="text-2xl font-bold">
              ${Number(total).toLocaleString("es-AR")}
            </span>
          </div>
          <button
            className="rounded-2xl bg-green-600 px-7 py-3 text-lg font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            onClick={confirmar}
            disabled={!metodo}
          >
            Confirmar pago
          </button>
        </div>
      </div>

      {/* Modal OK */}
      {showOK && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
          onClick={() => goTo("/")}
        >
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mb-2 text-3xl">✅</div>
            <div className="text-lg font-semibold">¡Pago confirmado!</div>
            <div className="mt-1 text-sm text-gray-600">
              Volviendo al inicio…
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
