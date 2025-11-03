import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// 👉 tu estampa ORIGINAL (no la toco)
import StampBackground from "./components/StampBackground";

// tus componentes (todo en components/)
import WelcomeScreen from "./components/WelcomeScreen.jsx";
import MenuScreen from "./components/MenuScreen.jsx";
import CheckoutScreen from "./components/CheckoutScreen.jsx";
import PayScreen from "./components/PayScreen.jsx";
import CartPanel from "./components/CartPanel.jsx";
import CartButton from "./components/CartButton.jsx";

import { goTo } from "./lib/navbus"; // util de navegación sin hooks
const QR_SRC = new URL("../assets/fake_qr.png", import.meta.url).href;
export default function App() {
  const [cartOpen, setCartOpen] = useState(false);

  // ✅ Fallback de navegación sin cambiar tu UI:
  // - En "/" si tocás "Continuar" → /menu
  // - En cualquier pantalla si tocás "Volver/Inicio/Welcome" → /
  useEffect(() => {
    const handler = (e) => {
      const el = e.target?.closest?.(
        "button, a, [role='button'], [data-nav], [data-goto]"
      );
      if (!el) return;

      const text = (el.textContent || "").trim().toLowerCase();
      const id = (el.id || "").toLowerCase();
      const data = (
        el.getAttribute("data-nav") ||
        el.getAttribute("data-goto") ||
        ""
      ).toLowerCase();

      const atRoot = window.location.pathname === "/" ||
                     window.location.pathname === "/index.html";

      // Continuar -> /menu (solo en la pantalla de bienvenida)
      if (
        atRoot &&
        (id === "continuar" ||
          data === "menu" ||
          text === "continuar" ||
          text.includes("continuar"))
      ) {
        e.preventDefault?.();
        e.stopPropagation?.();
        goTo("/menu");
        return;
      }

      // Volver / Inicio / Welcome -> /
      if (
        id === "volver" ||
        data === "home" ||
        data === "welcome" ||
        text === "volver" ||
        text.includes("volver al inicio") ||
        text.includes("inicio") ||
        text.includes("welcome")
      ) {
        e.preventDefault?.();
        e.stopPropagation?.();
        goTo("/");
        return;
      }
    };

    // capture = true para ganar prioridad si hay otros onClick
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* 🎨 Estampa global detrás de todo y sin bloquear clics */}
      <div className="pointer-events-none absolute inset-0 -z-50">
        <StampBackground />
      </div>

      {/* Rutas (tu UI intacta) */}
      <Routes>
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/menu" element={<MenuScreen />} />
        <Route path="/checkout" element={<CheckoutScreen />} />
        <Route path="/pay" element={<PayScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Carrito global (sin cambios) */}
      <CartPanel open={cartOpen} onClose={() => setCartOpen(false)} />
      <CartButton onClick={() => setCartOpen(true)} />
    </div>
  );
}
