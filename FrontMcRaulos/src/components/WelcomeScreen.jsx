import React, { useState } from 'react';

const OPTIONS = [
  { id: 'comer-aca',   label: 'Comer acá',   emoji: '🍽️' },
  { id: 'para-llevar', label: 'Para llevar', emoji: '🛍️' },
];

export default function WelcomeScreen({ onContinue }) {
  const [selected, setSelected] = useState(null);

  const handleContinue = () => {
    if (!selected) return;
    // guardamos elección por si la segunda pantalla la necesita
    localStorage.setItem('orderType', selected);
    onContinue?.(selected);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-xl border border-white/40 p-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full overflow-hidden shadow">
              <div className="w-full h-full bg-orange-400 flex items-center justify-center text-white font-bold text-lg">🍔</div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">McRaulos</h1>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">¡Bienvenido!</h2>
            <p className="text-gray-700">¿Cómo preferís disfrutar tu comida?</p>
          </div>

          <div className="flex flex-col gap-3">
            {OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSelected(opt.id)}
                className={
                  "w-full rounded-2xl border p-5 text-left shadow-sm hover:shadow transition bg-white " +
                  (selected === opt.id ? "border-red-600 ring-2 ring-red-600/40" : "border-gray-200")
                }
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{opt.emoji}</span>
                  <span className="text-lg font-semibold text-gray-900">{opt.label}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={handleContinue}
              disabled={!selected}
              className={`px-6 py-3 rounded-xl font-semibold ${selected ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-300 text-gray-600 cursor-not-allowed"}`}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
