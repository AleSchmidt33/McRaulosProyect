import { useEffect, useMemo, useState } from "react";
import { addCustomItem } from "../lib/cart";

/**
 * Normaliza la respuesta del backend:
 *  - Usa data.ingredientes_base (o data.ingredientes)
 *  - Excluye PAN
 *  - Arranca todos los ingredientes en qty = 1 (0=quitar, ≥2=extra)
 */
// Modificar normalizeIngredientsFromProducto
const normalizeIngredientsFromProducto = (payload) => {
  const prod = payload?.data ?? payload?.producto ?? payload ?? {};
  const base = prod.ingredientes_base ?? prod.ingredientes ?? [];
  return (base || [])
    .filter((i) => !/pan/i.test(String(i?.nombre ?? i?.name ?? "")))
    .map((i, idx) => ({
      id: i.id_ingrediente ?? i.id ?? i._id ?? idx,
      nombre: i.nombre ?? i.name ?? `Ingrediente ${idx + 1}`,
      qty: 1,
      precio: Number(i.precio ?? i.price ?? i.precio_extra ?? 0), // 🆕 AGREGAR PRECIO
    }));
};

// En handleAdd, asegurate de incluir el precio:
const handleAdd = () => {
  const custom = {
    ingredients: ingredientesList.map((x) => ({
      id: x.id,
      nombre: x.nombre,
      qty: Number(x.qty) || 0,
      precio: Number(x.precio) || 0, // 🆕 incluir precio
    })),
  };

  addCustomItem(product, custom, 1);
  onClose?.();
};

const getProductoId = (p) =>
  p?.id ?? p?.id_producto ?? p?.producto_id ?? p?.productoId ?? null;

export default function EditBurgerPanel({ open, product, onClose }) {
  const productId = getProductoId(product);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [baseIngredients, setBaseIngredients] = useState([]);
  const [qtyMap, setQtyMap] = useState({}); // { [idIng]: qty }

  // Carga ingredientes del backend usando RUTA RELATIVA (usa el proxy de Vite)
  useEffect(() => {
    if (!open || !productId) return;
    let cancel = false;
    setLoading(true);
    setErr(null);

    (async () => {
      try {
        const res = await fetch(`/api/productos/${productId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const ings = normalizeIngredientsFromProducto(data);
        if (!cancel) {
          setBaseIngredients(ings);
          const map = Object.fromEntries(ings.map((x) => [x.id, 1]));
          setQtyMap(map);
        }
      } catch (e) {
        if (!cancel) {
          console.warn(
            "[EditBurgerPanel] Ingredientes por back fallaron:",
            e?.message || e
          );
          setErr(
            "No se pudo cargar desde el servidor. Usando datos locales."
          );
          setBaseIngredients([]); // sin ingredientes editables
          setQtyMap({});
        }
      } finally {
        !cancel && setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [open, productId]);

  const ingredientesList = useMemo(() => {
    return baseIngredients.map((ing) => ({
      ...ing,
      qty: qtyMap[ing.id] ?? 1,
    }));
  }, [baseIngredients, qtyMap]);

  const onInc = (id) =>
    setQtyMap((m) => ({ ...m, [id]: Math.max(0, (m[id] ?? 1) + 1) }));
  const onDec = (id) =>
    setQtyMap((m) => ({ ...m, [id]: Math.max(0, (m[id] ?? 1) - 1) }));

  const handleAdd = () => {
    // Armamos el payload de personalización esperado por el carrito
  const custom = {
      ingredients: ingredientesList.map((x) => ({
        id: x.id,
        nombre: x.nombre,
        qty: Number(x.qty) || 0, // 0=sin, 1=base, ≥2=extra
        precio: Number(x.precio) || 0, // ✅ necesario para sumar extras
      })),
    };

    // Agrega como ítem separado (uid) para que no mergee con otras
    addCustomItem(product, custom, 1);
    onClose?.();
  };

  const title =
    product?.nombre || product?.name || product?.titulo || "Hamburguesa";

  return (
    <div
      className={`${
        open ? "block" : "hidden"
      } fixed inset-0 z-50 flex items-center justify-center`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onClose?.()}
      />

      {/* Panel */}
      <div className="relative z-10 w-[620px] max-w-[92vw] rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-yellow-100">🍔</div>
            <h2 className="text-xl font-semibold">Editar {title}</h2>
          </div>
          <button
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            onClick={() => onClose?.()}
            aria-label="Cerrar"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Texto guía */}
        <p className="mb-1 text-sm text-gray-700">
          Ajusta los ingredientes a tu gusto!
        </p>

        {/* Estado sin ingredientes */}
        {(!ingredientesList.length && !loading) && (
          <p className="mb-3 text-sm text-gray-600">
            Esta hamburguesa no tiene ingredientes editables.
          </p>
        )}

        {/* Aviso amarillo cuando hay error (igual al que tenías) */}
        {err && (
          <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            {err}
          </div>
        )}

        {/* Lista de ingredientes */}
        <div className="max-h-[320px] overflow-y-auto pr-1">
          {ingredientesList.map((ing) => (
            <div
              key={ing.id}
              className="flex items-center justify-between border-b py-2 last:border-b-0"
            >
              <span
                className={`text-sm ${
                  ing.qty === 0 ? "text-red-600 line-through" : "text-gray-800"
                }`}
              >
                {ing.nombre}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="h-8 w-8 rounded-full border text-lg leading-8 hover:bg-gray-50"
                  onClick={() => onDec(ing.id)}
                  aria-label="Disminuir"
                >
                  −
                </button>
                <div className="min-w-[2.5rem] text-center text-sm font-medium">
                  {ing.qty}
                </div>
                <button
                  className="h-8 w-8 rounded-full border text-lg leading-8 hover:bg-gray-50"
                  onClick={() => onInc(ing.id)}
                  aria-label="Aumentar"
                >
                  +
                </button>
              </div>
            </div>
          ))}

          {loading && (
            <div className="py-10 text-center text-sm text-gray-500">
              Cargando ingredientes…
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          <button
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            onClick={() => onClose?.()}
          >
            Cancelar
          </button>

          <button
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            onClick={handleAdd}
            disabled={loading}
          >
            Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  );
}
