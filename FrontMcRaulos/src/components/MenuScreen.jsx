// src/components/MenuScreen.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import TabsChrome from "./TabsChrome.jsx";
import { addItem } from "../lib/cart";
import EditBurgerPanel from "./EditBurgerPanel.jsx";
import Spinner from "./Spinner.jsx";

const ENDPOINT_TIPOS = "/productos/tipo_productos";
const byTypeEndpoint = (id) => `/productos/tipo_productos/${id}`;

// ---------- Helpers de imagen (no tocan el back) ----------
const looksLikeImg = (s) =>
  typeof s === "string" &&
  (s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("//") ||
    s.startsWith("/") ||
    /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(s));

const pickFirst = (arr) => arr.find((x) => x != null && String(x).trim() !== "");

function guessImageRaw(p) {
  if (!p || typeof p !== "object") return null;

  // 1) keys más probables
  const pri = pickFirst([
    p.imagen,
    p.imagen_url,
    p.url_imagen,
    p.image_url,
    p.img_url,
    p.imgUrl,
    p.imagenUrl,
    p.image,
    p.img,
    p.url,
    p.foto,
    p.foto_url,
    p.photo,
    p.picture,
    p.thumbnail,
    p.thumb,
    p.media?.url,
    p.image?.url,
    Array.isArray(p.images) ? p.images[0]?.url ?? p.images[0] : null,
    Array.isArray(p.fotos) ? p.fotos[0]?.url ?? p.fotos[0] : null,
  ]);
  if (looksLikeImg(pri)) return String(pri).trim();

  // 2) búsqueda heurística en todas las props de primer nivel
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === "string" && looksLikeImg(v)) return v.trim();
    if (v && typeof v === "object" && typeof v.url === "string" && looksLikeImg(v.url)) {
      return v.url.trim();
    }
  }
  return null;
}

function buildImgCandidates(raw) {
  if (!raw) return [];
  let s = String(raw).trim();

  // data: o absoluta
  if (s.startsWith("data:")) return [s];
  if (s.startsWith("https://")) return [s];
  if (s.startsWith("http://")) {
    // si la página está en https, probá https primero
    if (location.protocol === "https:") {
      try {
        const url = new URL(s);
        return [`https://${url.host}${url.pathname}${url.search}${url.hash}`, s];
      } catch {
        return [s];
      }
    }
    return [s];
  }

  // esquema-less //host/path
  if (s.startsWith("//")) {
    return [location.protocol + s, "https:" + s, "http:" + s];
  }

  // rutas absolutas del servidor (dejamos tal cual para que el proxy de Vite las resuelva)
  if (s.startsWith("/")) return [s];

  // nombre suelto -> carpeta /img del front
  return [`/img/${s}`];
}

function SmartImg({ product, alt, className }) {
  const raw = guessImageRaw(product);
  const candidates = useMemo(() => buildImgCandidates(raw), [raw]);
  const [i, setI] = useState(0);
  const src = candidates[i];

  if (!src) {
    return (
      <div className="w-full h-36 rounded-xl mb-3 bg-yellow-100 flex items-center justify-center text-4xl">
        🍔
      </div>
    );
  }

  // encodeURI ayuda si hay espacios u otros caracteres en el path
  const safeSrc = src.startsWith("data:") ? src : encodeURI(src);

  return (
    <img
      src={safeSrc}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={() => setI((x) => x + 1)}
    />
  );
}
// ----------------------------------------------------------

const strip = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function MenuScreen({ onBack, setGlobalLoading }) {
  const orderType = localStorage.getItem("orderType") || "comer-aca";

  const [tipos, setTipos] = useState([]);
  const [tiposLoading, setTiposLoading] = useState(true);
  const [tiposErr, setTiposErr] = useState(null);

  const [activeId, setActiveId] = useState(null);
  const cacheRef = useRef(new Map());
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsErr, setItemsErr] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  useEffect(() => () => setGlobalLoading?.(false), [setGlobalLoading]);

  // Cargar tipos
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setTiposLoading(true);
        setTiposErr(null);
        const res = await fetch(ENDPOINT_TIPOS);
        const json = await res.json();
        const data = json?.data ?? json;
        const list = (Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []).map(
          (t, i) => ({
            id: t.id_tipo_producto ?? t.id ?? t._id ?? i,
            nombre: t.nombre ?? t.descripcion ?? t.name ?? `Tipo ${i + 1}`,
          })
        );
        if (!alive) return;
        setTipos(list);
        const last = localStorage.getItem("tab_activa");
        const initial =
          last && list.find((t) => String(t.id) === String(last))
            ? last
            : list[0]?.id ?? null;
        setActiveId(initial);
      } catch (e) {
        if (alive) setTiposErr(String(e.message || e));
        console.error("Fallo GET /productos/tipo_productos", e);
      } finally {
        if (alive) setTiposLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Cargar productos por tipo (con caché)
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
        const json = await res.json();
        const data = json?.data;
        const productos = Array.isArray(data)
          ? data
          : Array.isArray(data?.productos)
          ? data.productos
          : [];

        const normalized = (productos || []).map((p, i) => ({
          id: p.id_producto ?? p.id ?? p._id ?? i,
          nombre: p.nombre ?? p.name ?? "Producto",
          precio: p.precio ?? p.precio_base ?? p.price ?? 0,
          descripcion: p.descripcion ?? p.description ?? "",
          // no fijamos imagen aquí; SmartImg la deduce del objeto original p
          __raw: p,
        }));

        if (!alive) return;
        cacheRef.current.set(activeId, normalized);
        setItems(normalized);
      } catch (e) {
        if (alive) setItemsErr(String(e.message || e));
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

  const tabs = useMemo(
    () => tipos.map((t) => ({ id: t.id, label: t.nombre })),
    [tipos]
  );

  const isBurgerTab = useMemo(() => {
    const t = tipos.find((x) => String(x.id) === String(activeId));
    const name = strip(t?.nombre || "");
    return name.includes("hamburg") || name.includes("burger");
  }, [tipos, activeId]);

  const abrirEditor = useCallback((p) => {
    setEditProduct(p);
    setEditOpen(true);
  }, []);

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Encabezado */}
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-xl border border-white/40 p-6 mb-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden shadow">
            <div className="w-full h-full bg-yellow-400 flex items-center justify-center text-white font-bold text-lg">
              🍟
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">¿Qué vas a pedir hoy?</h1>
            <p className="text-gray-600 text-sm">
              Modalidad:{" "}
              <span className="font-medium">
                {orderType === "comer-aca" ? "Comer acá" : "Para llevar"}
              </span>
            </p>
          </div>
          <div className="ml-auto">
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-gray-700 text-white hover:bg-gray-800"
            >
              Volver
            </button>
          </div>
        </div>

        {/* Tabs + grid */}
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
            <TabsChrome tabs={tabs} activeId={activeId} onChange={(id) => setActiveId(id)} />
          )}

          {/* Panel central */}
          <div className="mt-6">
            {itemsLoading && (
              <div className="flex items-center gap-2 p-2">
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
                    <SmartImg
                      product={p.__raw}
                      alt={p.nombre}
                      className="w-full h-36 object-cover rounded-xl mb-3"
                    />

                    <div className="text-base font-semibold">{p.nombre}</div>
                    {p.descripcion && (
                      <div className="text-sm text-gray-600 line-clamp-2">{p.descripcion}</div>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="font-bold">
                        {Number(p.precio).toLocaleString("es-AR", {
                          style: "currency",
                          currency: "ARS",
                          maximumFractionDigits: 0,
                        })}
                      </span>
                      <div className="flex gap-2">
                        {isBurgerTab && (
                          <button
                            onClick={() => abrirEditor(p)}
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

      <EditBurgerPanel open={editOpen} onClose={() => setEditOpen(false)} product={editProduct} />
    </div>
  );
}
