// src/components/StampBackground.jsx
// Fondo blanco con patrón de hamburguesitas amarillas (suave) + vignette leve.
// No intercepta clics y queda detrás de todo.
export default function StampBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
      {/* Capa 1: degradé blanco/super claro */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-neutral-50 to-neutral-100" />

      {/* Capa 2: patrón SVG repetido con hamburguesas (opacidad baja) */}
      <svg className="absolute inset-0 h-full w-full" style={{ opacity: 0.30 }}>
        <defs>
          {/* Ajustá width/height para más/menos densidad del patrón */}
          <pattern
            id="mcraulos-burger"
            patternUnits="userSpaceOnUse"
            width="48"
            height="48"
            patternTransform="rotate(0)"
          >
            {/* Grupo centrado: dibuja una mini hamburguesa */}
            <g transform="translate(0,0)">
              {/* Pan superior */}
              <g fill="#FFC82C">
                <rect x="8" y="12" width="32" height="12" rx="6" />
                {/* Semillitas */}
                <g fill="#ffffffff">
                  <circle cx="16" cy="16" r="1.0" />
                  <circle cx="20" cy="14" r="1.0" />
                  <circle cx="24" cy="16" r="1.0" />
                  <circle cx="28" cy="14" r="1.0" />
                  <circle cx="32" cy="16" r="1.0" />
                </g>
              </g>

              {/* Queso (sobresale un poco) */}
              <polygon points="12,27 36,27 30,30 18,30" fill="#FFD84D" />

              {/* Medallón */}
              <rect x="10" y="24" width="28" height="6" rx="3" fill="#FFD84D" />

              {/* Pan inferior */}
              <rect x="8" y="31" width="32" height="7" rx="4" fill="#FFC82C" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mcraulos-burger)" />
      </svg>

      {/* Capa 3: vignette sutil para profundidad */}
      <div className="absolute inset-0 bg-[radial-gradient(transparent_65%,rgba(255, 255, 255, 1)_100%)]" />
    </div>
  );
}
