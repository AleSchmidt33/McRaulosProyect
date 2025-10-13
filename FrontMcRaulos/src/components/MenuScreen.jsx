import { useEffect, useState } from "react";

// Endpoint REAL de tu back (proxyeado por Vite)
const ENDPOINT_TIPOS = "/productos/tipo_productos";

export default function MenuScreen({
  onBack,
  onOpenHamburgers,
  onOpenBebidas,
  onOpenExtras, // <-- ahora se recibe por props
}) {
  const orderType = localStorage.getItem("orderType") || "comer-aca";

  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(ENDPOINT_TIPOS);
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status} - ${text}`);
        const json = JSON.parse(text); // tu back: { status:'OK', data:[...] }

        const rows = Array.isArray(json?.data) ? json.data : [];
        const list = rows.map((t, i) => ({
          id: t.id_tipo_producto ?? t.id ?? t._id ?? i,
          nombre:
            t.nombre ??
            t.nombre_tipo_producto ??
            t.tipo ??
            t.name ??
            `Tipo #${i + 1}`,
        }));
        if (alive) setTipos(list);
      } catch (e) {
        if (alive) setErr(e.message);
        console.error("Fallo /productos/tipo_productos:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Click en un tipo
  const elegirTipo = (tipo) => {
    localStorage.setItem("selectedProductType", JSON.stringify(tipo));
    const name = (tipo?.nombre || "").toLowerCase();

    if (name.includes("hamburg")) {
      onOpenHamburgers?.(tipo);
    } else if (name.includes("bebid")) {
      onOpenBebidas?.(tipo);
    } else if (name.includes("extra") || name.includes("acompañ")) {
      onOpenExtras?.(tipo); // <-- ya no rompe si no la pasan
    } else {
      console.log("Tipo sin pantalla aún:", tipo);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Encabezado */}
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-xl border border-white/40 p-6 mb-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden shadow">
            <div className="w-full h-full bg-orange-400 flex items-center justify-center text-white font-bold text-lg">
              🍔
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">McRaulos</h1>
          <div className="ml-auto text-sm text-gray-700">
            Tipo de pedido: <span className="font-semibold">{orderType}</span>
          </div>
        </div>

        {loading && <p className="text-white/90">Cargando tipos de productos…</p>}
        {err && (
          <div className="bg-white/90 text-red-700 border border-red-200 rounded-xl p-3 mb-4">
            Error: {err}
          </div>
        )}

        {/* Tarjetas de tipos */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tipos.map((t) => (
            <button
              key={t.id}
              onClick={() => elegirTipo(t)}
              className="bg-white/95 backdrop-blur rounded-2xl shadow border border-white/40 p-6 text-left hover:shadow-md transition"
            >
              <div className="text-xl font-semibold mb-1 capitalize">{t.nombre}</div>
              <div className="text-sm text-gray-600">Tocar para seleccionar</div>
            </button>
          ))}
        </div>

        <div className="mt-8">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-gray-700 text-white hover:bg-gray-800"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
