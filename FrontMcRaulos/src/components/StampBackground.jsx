// Fondo rojo con estampado repetido de hamburguesas amarillas pequeñas
export default function StampBackground({
  base = "#C8102E",    // rojo tipo McDonald's
  stamp = "#FFD300",   // amarillo más puro y brillante
  opacity = 0.25,       // visibilidad de la estampa
  size = 60,            // más chico = más repetición
  rotate = -10          // leve inclinación diagonal
}) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
      <svg viewBox="0 0 800 600" className="w-full h-full" preserveAspectRatio="none">
        {/* Fondo rojo liso */}
        <rect x="0" y="0" width="800" height="600" fill={base} />

        <defs>
          {/* patrón repetido de hamburguesas */}
          <pattern
            id="burgerPattern"
            patternUnits="userSpaceOnUse"
            width={size}
            height={size}
            patternTransform={`rotate(${rotate})`}
          >
            <g opacity={opacity}>
              {/* Pan superior */}
              <path d="M10 15 a20 10 0 0 1 40 0 v4 h-40z" fill={stamp} />
              {/* Carne */}
              <rect x="13" y="20" width="34" height="5" rx="2" fill={stamp} />
              {/* Pan inferior */}
              <rect x="12" y="26" width="36" height="6" rx="2" fill={stamp} />
            </g>
          </pattern>
        </defs>

        {/* Usamos el patrón en toda el área */}
        <rect width="800" height="600" fill="url(#burgerPattern)" />
      </svg>
    </div>
  );
}
