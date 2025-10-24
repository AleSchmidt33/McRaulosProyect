// src/components/PayScreen.jsx
import { useEffect, useMemo, useState } from "react";
import { readCart, toBackendOrderPayload } from "../lib/cart";
import Modal from "./Modal";

<button
  id="modal-pago-confirmar"        // opcional, útil para depurar
  onClick={handleConfirmPaid}      // 👈 este es el cambio clave
  className="...tus mismas clases..."
>
  Confirmar
</button>

export default function PayScreen({ onBack, onSuccess }) {
  // --- Carrito
  const [items, setItems] = useState(() => safeRead());
  function safeRead() {
    try { return readCart(); } catch { return []; }
  }
  useEffect(() => {
    const refresh = () => {
      try { setItems(readCart()); } catch { setItems([]); }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("mcraulos:cart-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("mcraulos:cart-updated", refresh);
    };
  }, []);

  const itemCount = useMemo(
    () => items.reduce((acc, it) => acc + Number(it.qty ?? it.cantidad ?? 1), 0),
    [items]
  );
  const totalARS = useMemo(
    () => items.reduce((acc, it) => {
      const price = Number(it.precio ?? it.price ?? 0);
      const qty = Number(it.qty ?? it.cantidad ?? 1);
      return acc + price * qty;
    }, 0),
    [items]
  );

  // --- Método de pago (cards estilo anterior)
  const [method, setMethod] = useState("mp"); // "mp" | "tarjeta" | "efectivo"
  const [submitting, setSubmitting] = useState(false);

  // --- Modal
  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    primaryText: "OK",
    onPrimary: null,
    onClose: null,         // <- para controlar qué pasa al tocar el overlay
  });

  const openModal = (cfg) => setModal((m) => ({ ...m, open: true, ...cfg }));
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const goHome = () => {
    // cerrar modal y notificar éxito al app (limpia carrito + vuelve al inicio)
    closeModal();
    if (typeof onSuccess === "function") onSuccess();
    else window.dispatchEvent(new CustomEvent("mcraulos:payment-success"));
  };

  const handleConfirmPay = async () => {
    try {
      setSubmitting(true);
      if (items.length === 0) {
        openModal({
          type: "info",
          title: "Carrito vacío",
          message: "Agregá productos antes de continuar.",
          primaryText: "Entendido",
          onPrimary: closeModal,
          onClose: closeModal,
        });
        return;
      }

      const orderType = localStorage.getItem("orderType") || "comer-aca";
      const payload = toBackendOrderPayload(orderType);

      const map = { mp: 3, tarjeta: 1, efectivo: 2 }; // ajustá IDs si difieren
      const descripcion =
        method === "mp" ? "Mercado Pago" :
        method === "tarjeta" ? "Tarjeta en caja" : "Efectivo";

      payload.pago = { id_tipo_pago: map[method] ?? 1, descripcion };

      // 1) Crear pedido
      const r = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        let msg = `HTTP ${r.status}`;
        try { const err = await r.json(); if (err?.message) msg = err.message; } catch {}
        throw new Error(msg);
      }
      const data = await r.json();
      const id_pedido =
        data?.id_pedido ?? data?.data?.id_pedido ?? data?.pedido?.id ?? data?.id ?? data?.data?.id;

      // 2) Mercado Pago: pedir link y redirigir
      if (method === "mp") {
        if (!id_pedido) {
          // Sin ID → modal que vuelve al inicio al tocar cualquier lado
          openModal({
            type: "info",
            title: "Pedido creado",
            message:
              "Se creó tu pedido, pero no se pudo obtener el link de Mercado Pago.\nPodés abonar en caja.",
            primaryText: "Confirmar",
            onPrimary: goHome,
            onClose: goHome, // ← tocar el overlay también vuelve al inicio
          });
          return;
        }

        const rmp = await fetch("/mp/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_pedido }),
        });
        const mp = await rmp.json().catch(() => ({}));
        const init =
          mp?.init_point ?? mp?.sandbox_init_point ?? mp?.data?.init_point ?? mp?.data?.sandbox_init_point;

        if (init) {
          window.location.href = init; // Redirige a MP
          return;
        }

        // Sin link → modal que vuelve al inicio al tocar cualquier lado
        openModal({
          type: "info",
          title: "Pedido creado",
          message:
            "No se obtuvo el link de pago.\nPodés abonar en caja indicando tu número de pedido" +
            (id_pedido ? ` (ID: ${id_pedido}).` : "."),
          primaryText: "Confirmar",
          onPrimary: goHome,
          onClose: goHome,
        });
        return;
      }

      // 3) Tarjeta/Efectivo en caja → modal de éxito
      openModal({
        type: "success",
        title: "Pago confirmado",
        message:
          "Tu pedido fue registrado correctamente." +
          (id_pedido ? `\nNúmero de pedido: ${id_pedido}` : ""),
        primaryText: "Confirmar",
        onPrimary: goHome,
        onClose: goHome, // ← tocar el overlay también vuelve al inicio
      });
    } catch (e) {
      console.error(e);
      // Error: solo confirmar y cerrar (no volver al inicio automáticamente)
      openModal({
        type: "error",
        title: "No se pudo procesar",
        message: "Ocurrió un problema al procesar el pago.\nIntentá nuevamente o pagá en caja.",
        primaryText: "Entendido",
        onPrimary: closeModal,
        onClose: closeModal,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Métodos de pago</h1>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-white border hover:bg-gray-50"
            >
              Volver
            </button>
          )}
        </div>

        {/* Resúmenes */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <SummaryCard label="Productos" value={<strong className="text-2xl">{itemCount}</strong>} />
          <SummaryCard
            label="Total"
            value={
              <strong className="text-2xl">
                {totalARS.toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                  maximumFractionDigits: 0,
                })}
              </strong>
            }
          />
          <SummaryCard
            label="Modo"
            value={
              <strong className="text-2xl">
                {localStorage.getItem("orderType") === "para-llevar" ? "Para llevar" : "Comer acá"}
              </strong>
            }
          />
        </div>

        {/* Métodos (cards grandes) */}
        <div className="grid md:grid-cols-3 gap-4">
          <MethodCard
            selected={method === "mp"}
            onSelect={() => setMethod("mp")}
            icon={<span className="text-4xl">📲</span>}
            title="Mercado Pago"
            subtitle="Pagá online con QR o tarjeta."
            accent="red"
            badge="Recomendado"
          />
          <MethodCard
            selected={method === "tarjeta"}
            onSelect={() => setMethod("tarjeta")}
            icon={<span className="text-4xl">💳</span>}
            title="Tarjeta en caja"
            subtitle="Acreditación en mostrador."
            accent="amber"
          />
          <MethodCard
            selected={method === "efectivo"}
            onSelect={() => setMethod("efectivo")}
            icon={<span className="text-4xl">💵</span>}
            title="Efectivo"
            subtitle="Pagás cuando retirás."
            accent="emerald"
          />
        </div>

        <div className="mt-6">
          <button
            type="button"
            disabled={submitting || items.length === 0}
            onClick={handleConfirmPay}
            className={[
              "w-full md:w-auto px-6 py-3 rounded-xl font-semibold",
              submitting || items.length === 0
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700 active:scale-[.99]",
            ].join(" ")}
          >
            {submitting ? "Procesando..." : "Confirmar y pagar"}
          </button>
        </div>
      </div>

      {/* MODAL */}
      <Modal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        primaryText={modal.primaryText}
        onPrimary={modal.onPrimary || closeModal}
        onClose={modal.onClose || closeModal}
      />
    </div>
  );
}

/* ============ Subcomponentes ============ */

function SummaryCard({ label, value }) {
  return (
    <div className="bg-white/95 rounded-2xl border border-white/40 shadow p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}

function MethodCard({ selected, onSelect, icon, title, subtitle, accent = "red", badge }) {
  // clases fijas (evita purge de dinámicos)
  const selectedRing =
    accent === "red"
      ? "ring-2 ring-red-300 border-red-400"
      : accent === "amber"
      ? "ring-2 ring-amber-300 border-amber-400"
      : "ring-2 ring-emerald-300 border-emerald-400";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full text-left rounded-2xl border bg-white p-4 transition relative",
        "flex items-start gap-3",
        selected ? selectedRing : "border-gray-200 hover:border-gray-300",
      ].join(" ")}
    >
      <div className="shrink-0 w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-3xl">
        {icon}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="font-semibold">{title}</div>
          {badge && selected && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {badge}
            </span>
          )}
        </div>
        <div className="text-sm text-gray-600">{subtitle}</div>
      </div>

      <span
        aria-hidden
        className={[
          "absolute top-3 right-3 w-3 h-3 rounded-full",
          selected ? "bg-red-600" : "bg-gray-300",
        ].join(" ")}
      />
    </button>
  );
}
