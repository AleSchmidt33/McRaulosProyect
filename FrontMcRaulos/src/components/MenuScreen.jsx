// src/components/MenuScreen.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import TabsChrome from "./TabsChrome.jsx";
import { addItem } from "../lib/cart";
import EditBurgerPanel from "./EditBurgerPanel.jsx";
import Spinner from "./Spinner.jsx";

const ENDPOINT_TIPOS = "/productos/tipo_productos";
const byTypeEndpoint = (id) => `/productos/tipo_productos/${id}`;

// util simple para comparar sin acentos
const strip = (s = "") => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function MenuScreen({ onBack, setGlobalLoading }) {
  const orderType = localStorage.getItem("orderType") || "comer-aca";

  const [tipos, setTipos] = useState([]);
  const [tiposLoading, setTiposLoading] = useState(true);
  const [tiposErr, setTiposErr] = useState(null);

  const [activeId, setActiveId] = useState(null);
  const cacheRef = useRef(new Map()); // id_tipo_producto -> productos[]
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsErr, setItemsErr] = useState(null);

  // Panel de edición
  const [editOpen, setEditOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  // apaga overlay si se desmonta
  useEffect(() => () => setGlobalLoading?.(false), [setGlobalLoading]);

  // 1) Traer tipos (tabs)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setTiposLoading(true);
        setTiposErr(null);
        const res = await fetch(ENDPOINT_TIPOS);
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status} - ${text}`);
        const json = JSON.parse(text);
        const data = json?.data ?? json;
        const list = (Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []).map((t, i) => ({
          id: t.id_tipo_producto ?? t.id ?? t._id ?? i,
          nombre: t.nombre ?? t.descripcion ?? t.name ?? `Tipo ${i + 1}`,
        }));
        if (!alive) return;
        setTipos(list);
        const last = localStorage.getItem("tab_activa");
        const initial = last && list.find((t) => String(t.id) === String(last)) ? last : (list[0]?.id ?? null);
        setActiveId(initial);
      } catch (e) {
        if (alive) setTiposErr(e.message);
        console.error("Fallo GET /productos/tipo_productos", e);
      } finally {
        if (alive) setTiposLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // 2) Traer productos del tab (con caché) + overlay global
  useEffect(() => {
    let alive = true;
    (async () => {
      if (activeId == null) return;
      localStorage.setItem("tab_activa", String(activeId));

      if (cacheRef.current.has(activeId)) {
        setItems(cacheRef.current.get(activeId) || []);
        setItemsErr(null);
        setItemsLoading(false);
        setGlobalLoading?.(false);
        return;
      }

      try {
        setItemsLoading(true);
        setItemsErr(null);
        setGlobalLoading?.(true);

        const res = await fetch(byTypeEndpoint(activeId));
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status} - ${text}`);
        const json = JSON.parse(text);
        const data = json?.data;
        let productos = Array.isArray(data) ? data : (Array.isArray(data?.productos) ? data.productos : []);
        const normalized = (productos || []).map((p, i) => ({
          id: p.id_producto ?? p.id ?? p._id ?? i,
          nombre: p.nombre ?? p.name ?? "Producto",
          precio: p.precio ?? p.precio_base ?? p.price ?? 0,
          descripcion: p.descripcion ?? p.description ?? "",
          imagen: p.imagen ?? p.imagen_url ?? p.url_imagen ?? p.image_url ?? p.image ?? p.foto ?? null,
        }));
        if (!alive) return;
        cacheRef.current.set(activeId, normalized);
        setItems(normalized);
      } catch (e) {
        if (alive) setItemsErr(e.message);
        console.error("Fallo GET /productos/tipo_productos/:id", e);
      } finally {
        if (alive) {
          setItemsLoading(false);
          setGlobalLoading?.(false);
        }
      }
    })();
    return () => { alive = false; };
  }, [activeId, setGlobalLoading]);

  const tabs = useMemo(() => tipos.map(t => ({ id: t.id, label: t.nombre })), [tipos]);

  // 🔑 ¿El tab activo es hamburguesas?
  const isBurgerTab = useMemo(() => {
    const t = tipos.find((x) => String(x.id) === String(activeId));
    const name = strip(t?.nombre || "");
    // matchea “hamburguesa/s”, “hamburger”, “burger”
    return name.includes("hamburg") || name.includes("burger");
  }, [tipos, activeId]);

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Encabezado */}
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-xl border border-white/40 p-6 mb-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden shadow">
            <div className="w-full h-full bg-yellow-400 flex items-center justify-center text-white font-bold text-lg">🍟</div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">¿Qué vas a pedir hoy?</h1>
            <p className="text-gray-600 text-sm">Modalidad: <span className="font-semibold">{orderType === "comer-aca" ? "Comer acá" : "Para llevar"}</span></p>
          </div>
          <div className="ml-auto">
            <button onClick={onBack} className="px-4 py-2 rounded-xl bg-gray-700 text-white hover:bg-gray-800">
              Volver
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/70 backdrop-blur rounded-3xl shadow border border-white/40 p-4">
          {tiposLoading ? (
            <div className="flex items-center gap-2 p-2">
              <Spinner className="text-gray-700" size={20} border={3} label="Cargando categorías…" />
              <span className="text-gray-700">Cargando categorías…</span>
            </div>
          ) : tiposErr ? (
            <div className="bg-white/90 text-red-700 border border-red-200 rounded-xl p-3">
              Error cargando tipos: {tiposErr}
            </div>
          ) : (
            <TabsChrome
              tabs={tabs}
              activeId={activeId}
              onChange={(id) => setActiveId(id)}
            />
          )}

          {/* Panel central */}
          <div className="mt-6">
            {itemsLoading && (
              <div className="flex items-center gap-2 p-2 mb-4">
                <Spinner className="text-gray-700" size={24} border={3} label="Cargando productos…" />
                <span className="text-gray-700">Cargando productos…</span>
              </div>
            )}

            {itemsErr && (
              <div className="bg-white/90 text-red-700 border border-red-200 rounded-xl p-3 mb-4">
                Error: {itemsErr}
              </div>
            )}

            {!itemsLoading && !itemsErr && (
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
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="font-bold">
                        {Number(p.precio).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })}
                      </span>
                      <div className="flex gap-2">
                        {/* Mostrar "Editar" solo si el tab activo es hamburguesas */}
                        {isBurgerTab && (
                          <button
                            onClick={() => setEditProduct(p) || setEditOpen(true)}
                            className="px-3 py-1.5 rounded-lg bg-white border hover:bg-gray-50"
                            title="Editar ingredientes"
                          >
                            Editar
                          </button>
                        )}
                        <button
                          onClick={() => addItem(p, 1)}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!itemsLoading && !itemsErr && items.length === 0 && (
              <div className="bg-white/90 text-gray-700 border border-white/40 rounded-xl p-4 mt-6">
                No encontramos productos para este tipo.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel de edición (solo se abre si el tab es hamburguesas) */}
      <EditBurgerPanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        product={editProduct}
      />
    </div>
  );
}
