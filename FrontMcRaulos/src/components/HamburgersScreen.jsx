import { useEffect, useState } from "react";

// usamos el endpoint que SÍ existe en tu back:
// GET /productos/tipo_productos/:id_tipo_producto
const byTypeEndpoint = (id) => `/productos/tipo_productos/${id}`;

export default function HamburgersScreen({ selectedType, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);

        const tipoId =
          selectedType?.id_tipo_producto ??
          selectedType?.id ??
          selectedType?._id;

        if (tipoId == null) throw new Error("Falta id_tipo_producto");

        const res = await fetch(byTypeEndpoint(tipoId));
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status} - ${text}`);
        const json = JSON.parse(text);

        // Tu back suele responder { status:'OK', data:[...] }
        const data = json?.data;

        // Acomodamos distintos formatos posibles
        let productos = [];
        if (Array.isArray(data)) {
          // Opción A: ya es lista de productos
          productos = data;
        } else if (data && Array.isArray(data.productos)) {
          // Opción B: viene un objeto con .productos
          productos = data.productos;
        } else if (data && data.productos) {
          // Opción C: productos como objeto -> lo pasamos a array
          productos = Object.values(data.productos);
        }

        // Normalizamos claves
        const list = (productos || []).map((p, i) => ({
          id: p.id_producto ?? p.id ?? p._id ?? i,
          nombre: p.nombre ?? p.name ?? "Producto",
          precio: p.precio ?? p.price ?? 0,
          descripcion: p.descripcion ?? p.description ?? "",
          imagen: p.imagen ?? p.image ?? null,
        }));

        if (alive) setItems(list);
      } catch (e) {
        if (alive) setErr(e.message);
        console.error("Fallo /productos/tipo_productos/:id", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedType]);

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Encabezado */}
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-xl border border-white/40 p-6 mb-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden shadow">
            <div className="w-full h-full bg-orange-400 flex items-center justify-center text-white font-bold text-lg">🍔</div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {selectedType?.nombre ? `Hamburguesas — ${selectedType.nombre}` : "Hamburguesas"}
          </h1>
          <div className="ml-auto">
            <button onClick={onBack} className="px-4 py-2 rounded-xl bg-gray-700 text-white hover:bg-gray-800">
              Volver
            </button>
          </div>
        </div>

        {loading && <p className="text-white/90">Cargando hamburguesas…</p>}
        {err && (
          <div className="bg-white/90 text-red-700 border border-red-200 rounded-xl p-3 mb-4">
            Error: {err}
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((p) => (
            <div key={p.id} className="bg-white/95 backdrop-blur rounded-2xl shadow border border-white/40 p-4">
              {p.imagen ? (
                <img src={p.imagen} alt={p.nombre} className="w-full h-36 object-cover rounded-xl mb-3" />
              ) : (
                <div className="w-full h-36 rounded-xl mb-3 bg-yellow-100 flex items-center justify-center text-4xl">🍔</div>
              )}
              <div className="text-base font-semibold">{p.nombre}</div>
              {p.descripcion && <div className="text-sm text-gray-600 line-clamp-2">{p.descripcion}</div>}
              <div className="mt-3 flex items-center justify-between">
                <span className="font-bold">
                  {Number(p.precio).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })}
                </span>
                <button className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700">
                  Agregar
                </button>
              </div>
            </div>
          ))}
        </div>

        {!loading && !err && items.length === 0 && (
          <div className="bg-white/90 text-gray-700 border border-white/40 rounded-xl p-4 mt-6">
            No encontramos hamburguesas para este tipo.
          </div>
        )}
      </div>
    </div>
  );
}
