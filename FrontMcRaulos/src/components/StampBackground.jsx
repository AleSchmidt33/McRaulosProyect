// src/components/StampBackground.jsx
import React from "react";

/**
 * Fondo blanco con patrón de hamburguesitas amarillas.
 * - Capa 1: degradé blanco/super claro.
 * - Capa 2: patrón SVG repetido con hamburguesas amarillas (suave).
 * - Capa 3: vignette muy leve para profundidad.
 */
export default function StampBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      {/* Degradé blanco muy suave */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-neutral-50 to-neutral-100" />

      {/* Hamburguesitas amarillas repetidas (opacidad bajita para no saturar) */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.12 }}>
        <defs>
          {/* Ajustá width/height para más/menos densidad (p.ej. 72 / 96) */}
          <pattern id="mcraulos-burger" x="0" y="0" width="88" height="88" patternUnits="userSpaceOnUse">
            {/* tile A */}
            <g transform="translate(8,8)">
              <g fill="#FBBF24">{/* yellow-400 */}
                {/* pan arriba */}
                <path d="M8 20c0-8 8-14 20-14s20 6 20 14v4H8v-4z" />
                {/* semillas */}
                <circle cx="22" cy="12" r="1.5" />
                <circle cx="28" cy="10" r="1.3" />
                <circle cx="34" cy="12" r="1.2" />
                <circle cx="40" cy="10" r="1.1" />
                {/* relleno */}
                <rect x="10" y="26" width="36" height="6" rx="2" />
                {/* pan abajo */}
                <rect x="10" y="34" width="36" height="8" rx="4" />
              </g>
            </g>

            {/* tile B (desfasado) */}
            <g transform="translate(48,48)">
              <g fill="#FBBF24">
                <path d="M6 18c0-7 7-12 18-12s18 5 18 12v4H6v-4z" />
                <circle cx="18" cy="11" r="1.3" />
                <circle cx="23" cy="9" r="1.1" />
                <circle cx="28" cy="11" r="1.0" />
                <rect x="8" y="24" width="32" height="5" rx="2" />
                <rect x="8" y="31" width="32" height="7" rx="4" />
              </g>
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mcraulos-burger)" />
      </svg>

      {/* Vignette sutil para profundidad */}
      <div className="absolute inset-0 bg-[radial-gradient(transparent_65%,rgba(0,0,0,0.06)_100%)]" />
    </div>
  );
}
