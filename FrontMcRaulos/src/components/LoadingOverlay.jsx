// src/components/LoadingOverlay.jsx
import Spinner from "./Spinner.jsx";

export default function LoadingOverlay({ show, text = "Cargando…" }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-sm flex flex-col items-center justify-center">
      <Spinner size={48} border={4} className="text-white" label={text} />
      <div className="mt-3 text-white font-medium">{text}</div>
    </div>
  );
}
