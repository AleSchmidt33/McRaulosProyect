import { useEffect, useState } from "react";

// backend origin (si estás en vite 5173, asumimos back 3000)
const BACK_ORIGIN = (() => {
  try {
    const { protocol, hostname, port } = window.location;
    if (port === "5173") return `${protocol}//${hostname}:3000`;
    return `${protocol}//${hostname}${port ? ":" + port : ""}`;
  } catch {
    return "";
  }
})();

const EXT_RE = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i;

// muchas claves comunes
const IMAGE_KEYS = [
  "imagen_url","url_imagen","image_url","img_url","url",
  "imagen","image","img","foto","photo",
  "ruta_imagen","ruta","path","path_imagen","archivo","filename","nombre_imagen",
  "link","link_imagen","foto_url","url_foto"
];

function computeUrl(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // data URL
  if (/^data:image\//i.test(s)) return s;

  // http(s)
  if (/^https?:\/\//i.test(s)) return s;

  // ya apunta al proxy/back?
  if (s.startsWith("/api/") || s.startsWith("/productos/")) return s;

  // ruta absoluta tipo /uploads/… -> forzamos backend origin
  if (s.startsWith("/")) return `${BACK_ORIGIN}${s}`;

  // nombre de archivo relativo -> probamos en /uploads del back
  if (EXT_RE.test(s)) return `${BACK_ORIGIN}/uploads/${s.replace(/^\.?\//, "")}`;

  return null;
}

// búsqueda profunda de algo con pinta de url de imagen
function findImageUrlDeep(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 3) return null;

  // preferimos claves conocidas
  for (const k of IMAGE_KEYS) {
    if (k in obj) {
      const url = computeUrl(obj[k]);
      if (url) return url;
    }
  }

  // si hay arreglo "imagenes" o similar
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (Array.isArray(v)) {
      for (const it of v) {
        if (typeof it === "string") {
          const url = computeUrl(it);
          if (url) return url;
        } else if (it && typeof it === "object") {
          const url =
            computeUrl(it.url || it.link || it.ruta || it.path || it.filename) ||
            findImageUrlDeep(it, depth + 1);
          if (url) return url;
        }
      }
    }
  }

  // último recurso: cualquier string que parezca imagen
  for (const [, v] of Object.entries(obj)) {
    if (typeof v === "string" && (EXT_RE.test(v) || v.startsWith("http"))) {
      const url = computeUrl(v);
      if (url) return url;
    } else if (v && typeof v === "object") {
      const url = findImageUrlDeep(v, depth + 1);
      if (url) return url;
    }
  }
  return null;
}

export function pickImageField(obj) {
  if (!obj || typeof obj !== "object") return null;
  return findImageUrlDeep(obj);
}

export const PLACEHOLDER_SVG =
  "data:image/svg+xml;utf8," +
  "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>" +
  "<rect width='100%' height='100%' fill='%23f3f4f6'/>" +
  "<text x='50%' y='50%' font-family='Arial' font-size='22' text-anchor='middle' fill='%239ca3af'>Sin imagen</text>" +
  "</svg>";

export function useProductImage(product) {
  const [src, setSrc] = useState(() => pickImageField(product));

  useEffect(() => {
    let alive = true;

    const immediate = pickImageField(product);
    if (immediate) {
      setSrc(immediate);
      return () => {};
    }

    // si el listado no trae la url, pedimos el detalle
    async function fetchDetail() {
      const id = product?.id ?? product?.id_producto ?? product?._id;
      if (!id) return;
      try {
        const r = await fetch(`/api/productos/${id}`);
        if (!r.ok) return;
        const full = await r.json();
        const url = pickImageField(full);
        if (alive && url) setSrc(url);
      } catch {}
    }

    fetchDetail();
    return () => {
      alive = false;
    };
  }, [product?.id, product?.id_producto, product?._id]);

  return src;
}
