// src/components/PayScreen.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { readCart, toBackendOrderPayload, clearCart } from "../lib/cart";
const QR_IMG_URL = `${import.meta.env.BASE_URL}fake_qr.png?v=1`;
const QR_SRC = "/fake_qr.png"; // poné tu imagen en public/fake_qr.png

/* ===== Modal base reutilizable ===== */
function Modal({ open, title, message, type = "info", primaryText = "OK", onPrimary, onClose, children }) {
  if (!open) return null;

  const typeStyles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
  };
  const iconMap = { info: "ℹ️", success: "✅", error: "❌" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <span className="text-3xl">{iconMap[type]}</span>
          <h3 className="text-xl font-semibold">{title}</h3>
        </div>

        {message && (
          <div className={`mb-6 rounded-lg border p-4 ${typeStyles[type]}`}>
            <p className="whitespace-pre-line">{message}</p>
          </div>
        )}

        {children}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onPrimary || onClose}
            className="rounded-xl bg-red-600 px-6 py-2 font-semibold text-white hover:bg-red-700"
          >
            {primaryText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Modal específico para QR (simulación) ===== */
function QrModal({ open, secondsLeft }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-xl font-semibold mb-4">Pagá con QR</h3>
        <div className="rounded-2xl border bg-gray-50 p-4 flex flex-col items-center">
          <img
  src={QR_IMG_URL}
  alt="QR de pago"
  className="w-64 h-64 object-contain rounded-md mb-3"
  draggable={false}
  onError={(e) => {
    // Fallback visible si el archivo está roto
    e.currentTarget.src =
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'>
           <rect width='100%' height='100%' fill='#f3f4f6'/>
           <text x='50%' y='50%' dy='.3em' text-anchor='middle'
             fill='#9ca3af' font-family='sans-serif'>QR no disponible</text>
         </svg>`
      );
  }}
/>
          
          <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1 self-start">
            <li>Abrí tu app de Mercado Pago o bancaria.</li>
            <li>Elegí “Pagar con QR”.</li>
            <li>Apuntá la cámara al código.</li>
            <li>Confirmá el pago en tu app.</li>
          </ol>
        </div>
        <div className="mt-4 text-center text-sm text-gray-600">
          Confirmando pago… <strong>{secondsLeft}s</strong>
        </div>
      </div>
    </div>
  );
}

export default function PayScreen({ onBack, onSuccess }) {
  const navigate = useNavigate();

  // --- Carrito
  const [items, setItems] = useState(() => {
    try { return readCart(); } catch { return []; }
  });

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
    () => items.reduce((acc, it) => acc + Number(it.precio ?? it.price ?? 0) * Number(it.qty ?? it.cantidad ?? 1), 0),
    [items]
  );

  // --- Método de pago & estados
  const [method, setMethod] = useState("efectivo");
  const [submitting, setSubmitting] = useState(false);

  // --- Modales
  const [modal, setModal] = useState({
    open: false, type: "info", title: "", message: "", primaryText: "OK", onPrimary: null, onClose: null,
  });
  const openModal = (cfg) => setModal((m) => ({ ...m, open: true, ...cfg }));
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  // QR simulation
  const [qrOpen, setQrOpen] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(5);

  useEffect(() => {
    if (!qrOpen) return;
    setQrCountdown(5);
    const int = setInterval(() => setQrCountdown((s) => (s > 0 ? s - 1 : 0)), 1000);
    const to = setTimeout(() => {
      setQrOpen(false);
      openModal({
        type: "success",
        title: "Pago confirmado",
        message: "Tu pedido fue registrado correctamente.",
        primaryText: "Confirmar",
        onPrimary: goHome,
        onClose: goHome,
      });
    }, 5000);
    return () => {
      clearInterval(int);
      clearTimeout(to);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrOpen]);

  const goHome = () => {
    closeModal();
    try { clearCart(); } catch {}
    try { window.dispatchEvent(new Event("mcraulos:cart-updated")); } catch {}
    setTimeout(() => {
      if (typeof onSuccess === "function") onSuccess();
      navigate("/");
    }, 600);
  };

  const handleContinueEditing = () => navigate("/menu");

  const handleCancelOrder = () => {
    try { clearCart(); } catch {}
    try { localStorage.clear(); } catch {}
    try { window.dispatchEvent(new Event("mcraulos:cart-updated")); } catch {}
    navigate("/");
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
          onPrimary: closeModal, onClose: closeModal,
        });
        return;
      }

      const orderType = localStorage.getItem("orderType") || "comer-aca";
      const payload = toBackendOrderPayload(orderType);

      const paymentMap = { efectivo: 1, mp: 2, tarjeta: 3 };
      const descripcionMap = {
        efectivo: "Efectivo",
        mp: "Mercado Pago (QR)",
        tarjeta: "Tarjeta en caja",
      };

      payload.pago = {
        id_tipo_pago: paymentMap[method] ?? 1,
        descripcion: descripcionMap[method],
      };

      // 1) Crear pedido en el back
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
      const id_pedido = data?.id_pedido ?? data?.data?.id_pedido ?? data?.pedido?.id ?? data?.id ?? data?.data?.id;

      // 2) Flujo QR simulado
      if (method === "mp") {
        setQrOpen(true);
        return;
      }

      // 3) Efectivo/Tarjeta → modal de éxito normal
      openModal({
        type: "success",
        title: "Pago confirmado",
        message:
          "Tu pedido fue registrado correctamente." +
          (id_pedido ? `\nNúmero de pedido: ${id_pedido}` : ""),
        primaryText: "Confirmar",
        onPrimary: goHome,
        onClose: goHome,
      });
    } catch (e) {
      console.error(e);
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
            <button type="button" onClick={onBack} className="px-4 py-2 rounded-xl bg-white border hover:bg-gray-50">
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
                {totalARS.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })}
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
            selected={method === "efectivo"}
            onSelect={() => setMethod("efectivo")}
            icon={<span className="text-4xl">💵</span>}
            title="Efectivo"
            subtitle="Pagás cuando retirás."
            accent="emerald"
            badge="Recomendado"
          />
          <MethodCard
            selected={method === "mp"}
            onSelect={() => setMethod("mp")}
            icon={<span className="text-4xl">📲</span>}
            title="Mercado Pago (QR)"
            subtitle="Escaneá y listo."
            accent="blue"
          />
          <MethodCard
            selected={method === "tarjeta"}
            onSelect={() => setMethod("tarjeta")}
            icon={<span className="text-4xl">💳</span>}
            title="Tarjeta en caja"
            subtitle="Acreditación en mostrador."
            accent="amber"
          />
        </div>

        {/* Acciones secundarias */}
        <div className="mt-6 flex flex-col md:flex-row gap-3">
          <button
            type="button"
            onClick={handleContinueEditing}
            className="w-full md:w-auto px-6 py-3 rounded-xl font-semibold bg-white border hover:bg-gray-50"
          >
            Seguir editando
          </button>
          <button
            type="button"
            onClick={handleCancelOrder}
            className="w-full md:w-auto px-6 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
          >
            Cancelar pedido
          </button>
        </div>

        {/* Acción principal */}
        <div className="mt-3">
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
            {submitting ? "Procesando..." : method === "mp" ? "Confirmar y mostrar QR" : "Confirmar y pagar"}
          </button>
        </div>
      </div>

      {/* Modales */}
      <QrModal open={qrOpen} secondsLeft={qrCountdown} />
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

/* ===== Subcomponentes ===== */

function SummaryCard({ label, value }) {
  return (
    <div className="bg-white/95 rounded-2xl border border-white/40 shadow p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}

function MethodCard({ selected, onSelect, icon, title, subtitle, accent = "red", badge }) {
  const selectedRing =
    accent === "red"
      ? "ring-2 ring-red-300 border-red-400"
      : accent === "amber"
      ? "ring-2 ring-amber-300 border-amber-400"
      : accent === "blue"
      ? "ring-2 ring-blue-300 border-blue-400"
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
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">{badge}</span>
          )}
        </div>
        <div className="text-sm text-gray-600">{subtitle}</div>
      </div>
      <span aria-hidden className={["absolute top-3 right-3 w-3 h-3 rounded-full", selected ? "bg-green-600" : "bg-gray-300"].join(" ")} />
    </button>
  );
}
