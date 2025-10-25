import { useEffect, useState } from "react";
import { getCartCount, subscribeCart } from "../lib/cart";

export default function CartButton({ onClick }) {
  const [count, setCount] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setCount(getCartCount());
    const unsub = subscribeCart(() => setCount(getCartCount()));
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const update = () => setHidden(document.body.classList.contains("cart-open"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  if (hidden) return null;

  return (
    <button
      className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-3 font-semibold shadow-lg hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-black/20"
      onClick={onClick}
      aria-label="Abrir carrito"
      title="Abrir carrito"
    >
      🛒 <span>¡Carrito!</span>
      <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-sm">
        {count}
      </span>
    </button>
  );
}
