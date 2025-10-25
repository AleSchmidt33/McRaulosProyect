// src/components/WelcomeScreen.jsx
import { useState, useCallback } from "react";
import StampBackground from "./StampBackground";

export default function WelcomeScreen({ onContinue }) {
  const [mode, setMode] = useState(
    () => localStorage.getItem("orderType") || "comer-aca"
  );

  const handleContinue = useCallback(
    (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      try {
        localStorage.setItem("orderType", mode);
      } catch {}
      if (typeof onContinue === "function") {
        onContinue();
      } else {
        // Fallback por si no te llega la prop
        window.dispatchEvent(new CustomEvent("mcraulos:go-menu"));
      }
    },
    [mode, onContinue]
  );

  const Option = ({ value, emoji, label }) => {
    const active = mode === value;
    return (
      <button
        type="button"
        onClick={() => setMode(value)}
        className={[
          "w-full text-left px-5 py-4 rounded-2xl border transition",
          "flex items-center gap-3 select-none",
          active
            ? "border-red-400 ring-2 ring-red-300"
            : "border-gray-200 hover:border-gray-300",
        ].join(" ")}
      >
        <span className="text-2xl">{emoji}</span>
        <span className="font-semibold">{label}</span>
      </button>
    );
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center">
      {/* Fondo con estampa, detrás y sin bloquear clics */}
      <div className="pointer-events-none absolute inset-0 -z-50">
        <StampBackground />
      </div>

      {/* Contenido existente (sin cambios de lógica) */}
      <div className="w-full max-w-md px-6">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🍔</span>
            <h1 className="text-2xl font-semibold">McRaulos</h1>
          </div>

          <h2 className="text-3xl font-extrabold mb-2">¡Bienvenido!</h2>
          <p className="text-gray-600 mb-6">¿Cómo preferís disfrutar tu comida?</p>

          <div className="space-y-4">
            <Option value="comer-aca" emoji="🍽️" label="Comer acá" />
            <Option value="para-llevar" emoji="🛍️" label="Para llevar" />
          </div>

          <button
            id="continue-btn"
            type="button"
            onClick={handleContinue}
            className="mt-6 w-full rounded-xl py-3 font-semibold bg-red-700 text-white hover:bg-red-800 active:scale-[.98] focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
