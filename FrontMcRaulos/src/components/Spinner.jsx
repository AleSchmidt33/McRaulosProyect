// src/components/Spinner.jsx
export default function Spinner({ className = "", size = 24, border = 3, label = "Cargando…" }) {
  const style = { width: size, height: size, borderWidth: border };
  return (
    <span className="inline-flex items-center gap-2" role="status" aria-label={label}>
      <span
        className={`inline-block border-current border-t-transparent rounded-full animate-spin ${className}`}
        style={style}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
