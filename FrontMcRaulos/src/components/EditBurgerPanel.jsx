// src/components/EditBurgerPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { addCustomItem } from "../lib/cart";

const byIdEndpoint = (id) => `/api/productos/${id}`;

export default function EditBurgerPanel({ open, onClose, product }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [baseIngredients, setBaseIngredients] = useState([]); // [{id, nombre}]
  const [qtyMap, setQtyMap] = useState({}); // {idIngrediente: qty}

  const productId = product?.id ?? product?.id_producto ?? product?._id ?? null;

  // Cargar ingredientes del producto (excluye pan)
  useEffect(() => {
    let alive = true;
    if (!open || productId == null) return;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(byIdEndpoint(productId));
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status} - ${text}`);
        const json = JSON.parse(text);
        const data = json?.data ?? json;

        const lista = Array.isArray(data?.ingredientes_base) ? data.ingredientes_base : [];
        const normalized = lista
          .map((ing, i) => ({
            id: ing.id_ingrediente ?? ing.id ?? ing._id ?? i,
            nombre: ing.nombre ?? ing.name ?? "Ingrediente",
          }))
          .filter((x) => !/^\s*pan\b/i.test(x.nombre)); // excluir "pan"

        if (!alive) return;
        setBaseIngredients(normalized);
        // qty 1 por defecto (presente); 0 = quitar; >=2 = extra
        const map = {};
        normalized.forEach((ing) => (map[ing.id] = 1));
        setQtyMap(map);
      } catch (e) {
        if (alive) setErr(e.message);
        console.error("Fallo GET /api/productos/:id", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, productId]);

  const onInc = (id) => setQtyMap((m) => ({ ...m, [id]: Math.max(0, (Number(m[id]) || 0) + 1) }));
  const onDec = (id) => setQtyMap((m) => ({ ...m, [id]: Math.max(0, (Number(m[id]) || 0) - 1) }));

  const customPayload = useMemo(() => {
    // Guardamos la personalización como lista {id_ingrediente, nombre, qty}
    const ingredients = baseIngredients.map((ing) => ({
      id_ingrediente: ing.id,
      nombre: ing.nombre,
      qty: Number(qtyMap[ing.id] ?? 0),
    }));
    return { ingredients };
  }, [baseIngredients, qtyMap]);

  const onSave = () => {
    // Guardar como item SEPARADO en el carrito
    addCustomItem(product, customPayload, 1);
    onClose?.();
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40" onClick={onClose} />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-400 text-white flex items-center justify-center text-lg">🍔</div>
          <h2 className="text-xl font-semibold">
            Editar {product?.nombre ?? "Hamburguesa"}
          </h2>
          <button onClick={onClose} className="ml-auto px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200">✕</button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {loading && <div className="bg-gray-50 border rounded-xl p-3">Cargando ingredientes…</div>}
          {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3">Error: {err}</div>}

          {!loading && !err && (
            <>
              <p className="text-sm text-gray-600 mb-3">
                Ajustá la cantidad de cada ingrediente (se excluye el pan). <strong>0 = sin ingrediente</strong>, <strong>2+ = extra</strong>.
              </p>

              <ul className="space-y-3">
                {baseIngredients.map((ing) => (
                  <li key={ing.id} className="border rounded-xl p-3 flex items-center gap-3">
                    <div className="font-medium flex-1">{ing.nombre}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onDec(ing.id)}
                        className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                        aria-label="disminuir"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-semibold">
                        {qtyMap[ing.id] ?? 0}
                      </span>
                      <button
                        onClick={() => onInc(ing.id)}
                        className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                        aria-label="aumentar"
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="p-4 border-t bg-white flex gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200">Cancelar</button>
          <button
            onClick={onSave}
            className="ml-auto px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
          >
            Guardar personalización
          </button>
        </div>
      </aside>
    </>
  );
}
