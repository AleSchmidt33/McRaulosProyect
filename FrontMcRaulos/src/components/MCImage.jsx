import { useProductImage, PLACEHOLDER_SVG } from "../lib/images";

export default function MCImage({
  producto,
  alt,
  className = "w-full h-40 object-cover rounded-xl bg-neutral-100",
}) {
  const src = useProductImage(producto);

  const finalAlt =
    alt ||
    producto?.nombre ||
    producto?.title ||
    producto?.descripcion ||
    "Producto";

  const onErr = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = PLACEHOLDER_SVG;
  };

  return (
    <img
      src={src || PLACEHOLDER_SVG}
      alt={finalAlt}
      className={className}
      onError={onErr}
      loading="lazy"
      decoding="async"
    />
  );
}
