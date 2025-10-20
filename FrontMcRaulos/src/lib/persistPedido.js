// src/lib/persistPedido.js
import { readCart } from "./cart";

// elimina claves undefined
function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// lee 'orderType' guardado en WelcomeScreen: 'comer-aca' | 'para-llevar'
function mapOrderTypeToId() {
  const t = localStorage.getItem("orderType");
  if (t === "para-llevar") return 2; // ⚠️ cambialo si tu BD usa otros IDs
  return undefined; // comer-aca -> dejá que el backend use su default (1)
}

// convierte mods de hamburguesa a ingredientes_personalizados
function mapModsToIngredientes(mods) {
  const out = [];
  const add = (mods?.add || []).map((id) => ({
    id_ingrediente: Number(id),
    cantidad: 1,
    es_extra: true,
  }));
  const remove = (mods?.remove || []).map((id) => ({
    id_ingrediente: Number(id),
    cantidad: 1,
    es_extra: false,
  }));
  return out.concat(add, remove);
}

// construye el payload que tu backend espera a partir del localStorage
export function buildPedidoPayloadFromLocalStorage({
  idTipoPago = 1,       // requerido por tu back (ajustá según tabla)
  descripcionPago,      // opcional
  idCliente,            // opcional
  idCupon,              // opcional
} = {}) {
  const items = readCart(); // [{ id, qty, precio, tipo, modificaciones, nota, ... }]
  const productos = [];

  for (const it of items) {
    const qty = Number(it.qty) || 1;
    if (!it?.id) continue;

    const base = {
      id_producto: Number(it.id),
      notas: it.nota || it.note || null,
      ingredientes_personalizados: mapModsToIngredientes(it.modificaciones || it.edits),
    };

    // expandimos por cantidad (tu back inserta detalle por producto)
    for (let i = 0; i < qty; i++) productos.push(base);
  }

  return clean({
    id_cliente: idCliente ? Number(idCliente) : undefined,
    id_tipo_pedido: mapOrderTypeToId(), // si es undefined, el back usa 1
    id_cupon: idCupon ? Number(idCupon) : undefined,
    productos,
    pago: clean({
      id_tipo_pago: Number(idTipoPago),
      descripcion: descripcionPago,
    }),
  });
}

// persiste el pedido usando el endpoint existente del backend
export async function persistPedidoFromLocalStorage(opts = {}) {
  const payload = buildPedidoPayloadFromLocalStorage(opts);

  if (!payload.productos?.length) throw new Error("El carrito está vacío.");
  if (!payload.pago?.id_tipo_pago) throw new Error("Falta id_tipo_pago.");

  const res = await fetch("/api/pedidos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Error al crear el pedido");
  }

  // tu back suele responder { status, message, data: { pedido, pago, detalles, ... } }
  return await res.json();
}
