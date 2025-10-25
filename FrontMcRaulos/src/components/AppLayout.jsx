// Envoltorio global que pinta tu fondo en todas las pantallas
import StampBackground from "./StampBackground.jsx";

export default function AppLayout({ children }) {
  return (
    <div className="relative min-h-screen">
      {/* Fondo global: detrás de todo y sin bloquear clics */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <StampBackground />
      </div>

      {/* Contenido normal de cada pantalla */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
