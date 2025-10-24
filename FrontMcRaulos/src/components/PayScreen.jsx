// src/components/PayScreen.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { submitOrderFromLocalStorageOptimistic, CART_KEY, flushOutbox } from "../lib/orders.js";

export default function PayScreen({ onBack, onDone, setGlobalLoading }) {
  const methods = useMemo(
    () => [
      { id: "mp",    label: "Mercado Pago", icon: "💙" },
      { id: "card",  label: "Tarjeta",       icon: "💳" },
      { id: "cash",  label: "Efectivo",      icon: "💵" },
    ],
    []
  );

  const [selected, setSelected] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [infoMsg, setInfoMsg] = useState(null);

  // Si abrís la app de nuevo, intentá vaciar outbox silenciosamente
  useEffect(() => {
    flushOutbox().catch(() => {});
  }, []);

  useEffect(() => () => setGlobalLoading?.(false), [setGlobalLoading]);

  const clearCart = useCallback(() => {
    try {
      localStorage.removeItem(CART_KEY);
      window.dispatchEvent(new Event("cart:update"));
    } catch {}
  }, []);

  // Confirmar del modal: SIEMPRE navega a Welcome; la API no bloquea la UI
  const handleConfirmPaid = useCallback(async () => {
    setGlobalLoading?.(true);
    setInfoMsg(null);

    // Disparamos el envío con timeout, pero NO esperamos para navegar
    submitOrderFromLocalStorageOptimistic(4000)
      .then((r) => {
        if (!r.ok && r.queued) {
          // Quedó en outbox; lo informamos sutilmente (si seguís en esta pantalla)
          setInfoMsg("Sin conexión al guardar pedido. Se enviará automáticamente al reconectar.");
        }
      })
      .catch(() => {
        setInfoMsg("No se pudo contactar al servidor. El pedido quedó en cola para enviar.");
      })
      .finally(() => setGlobalLoading?.(false));

    // Limpieza y navegación inmediata
    clearCart();
    setSuccessOpen(false);
    if (typeof onDone === "function") onDone();
    else window.location.assign("/");
  }, [clearCart, onDone, setGlobalLoading]);

  const payNow = useCallback(() => {
    if (!selected) return;
    setSuccessOpen(true);
  }, [selected]);

  // Tecla ESC confirma (mantengo tu UX anterior)
  useEffect(() => {
    if (!successOpen) return;
    const onKey = (e) => e.key === "Escape" && handleConfirmPaid();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [successOpen, handleConfirmPaid]);

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-bold">Elegí un método de pago</h1>
        </div>

        {/* métodos */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {methods.map((m) => {
            const active = selected === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m.id)}
                className={[
                  "rounded-2xl border p-5 text-left shadow-sm transition",
                  active ? "ring-2 ring-red-500 border-red-300" : "hover:shadow-md",
                ].join(" ")}
              >
                <div className="text-3xl mb-3">{m.icon}</div>
                <div className="text-lg font-semibold">{m.label}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {m.id === "mp" && "Pagá con tu cuenta de Mercado Pago."}
                  {m.id === "card" && "Crédito o débito."}
                  {m.id === "cash" && "Abonarás en el local."}
                </div>
              </button>
            );
          })}
        </div>

        {infoMsg && (
          <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-lg">
            {infoMsg}
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-5 py-3 rounded-xl border bg-white hover:bg-gray-50"
          >
            Seguir editando
          </button>
          <button
            id="pay-now-btn"
            onClick={payNow}
            disabled={!selected}
            className={[
              "px-6 py-3 rounded-xl text-white font-semibold",
              selected ? "bg-green-600 hover:bg-green-700" : "bg-gray-300 cursor-not-allowed",
            ].join(" ")}
          >
            Confirmar y pagar
          </button>
        </div>
      </div>

      {/* Modal de pago confirmado */}
      {successOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[150]" />
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-xl font-bold mb-2">¡Pago confirmado!</h2>
              <p className="text-gray-600 mb-6">
                Guardaremos tu pedido en el sistema.
              </p>
              <button
                id="modal-pago-confirmar"
                onClick={handleConfirmPaid}
                className="w-full px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
