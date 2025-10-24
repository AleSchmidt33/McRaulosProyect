// src/components/WavyBackground.jsx
export default function WavyBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      {/* Degradado base */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-red-50" />
      {/* Onda suave */}
      <svg
        className="absolute bottom-0 left-0 right-0"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="rgba(255,255,255,0.6)"
          d="M0,224L60,229.3C120,235,240,245,360,240C480,235,600,213,720,213.3C840,213,960,235,1080,240C1200,245,1320,235,1380,229.3L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
        />
      </svg>
    </div>
  );
}
