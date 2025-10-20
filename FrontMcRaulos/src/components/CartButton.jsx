// src/components/CartButton.jsx
import { useEffect, useState } from "react";
import { countItems } from "../lib/cart";

export default function CartButton({ onClick }) {
  const [count, setCount] = useState(countItems());

  useEffect(() => {
    const handler = () => setCount(countItems());
    window.addEventListener("cart:update", handler);
    handler(); // actualizar al montar
    return () => window.removeEventListener("cart:update", handler);
  }, []);

  return (
    <button
      onClick={onClick}
      className="fixed right-4 bottom-4 z-50 rounded-full shadow-lg bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-5 py-3 font-semibold flex items-center gap-2"
    >
      🛒 Carrito
      <span className="ml-1 inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-white text-gray-900 text-sm font-bold">
        {count}
      </span>
    </button>
  );
}
