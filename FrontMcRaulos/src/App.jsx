import { useState } from "react";
import StampBackground from "./components/StampBackground.jsx";
import WelcomeScreen from "./components/WelcomeScreen.jsx";
import MenuScreen from "./components/MenuScreen.jsx";
import HamburgersScreen from "./components/HamburgersScreen.jsx";
import BebidasScreen from "./components/BebidasScreen.jsx";
import ExtrasScreen from "./components/ExtrasScreen.jsx";
import CartButton from "./components/CartButton.jsx";
import CartPanel from "./components/CartPanel.jsx";
import LoadingOverlay from "./components/LoadingOverlay.jsx";
import CheckoutScreen from "./components/CheckoutScreen.jsx";
import PayScreen from "./components/PayScreen.jsx";


export default function App() {
  const [screen, setScreen] = useState("welcome"); // 'welcome' | 'menu' | 'hamburgers' | 'bebidas' | 'extras' | 'checkout'
  const [selectedType, setSelectedType] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);

  // 👉 Helper mínimo para pagar SIN tocar tu UI
  async function handlePay() {
    try {
      setGlobalLoading(true);

      // 1) Leo carrito y modalidad (como ya los usa tu Checkout)
      const items = JSON.parse(localStorage.getItem("mcraulos_cart_v1") || "[]");
      const orderType = localStorage.getItem("orderType") || "comer-aca";

      // 2) Armo payload simple para el endpoint /mp/link del back
      const mpItems = (items || []).map((it) => ({
        title: String(it?.nombre ?? it?.name ?? "Producto"),
        quantity: Number(it?.qty ?? 1),
        unit_price: Number(it?.precio ?? it?.price ?? 0),
        currency_id: "ARS",
      }));
      const total = mpItems.reduce((a, i) => a + i.quantity * i.unit_price, 0);
      const backUrl = location.origin;
      const payload = {
        items: mpItems,
        orderType,
        total,
        back_urls: {
          success: `${backUrl}/?pago=ok`,
          failure: `${backUrl}/?pago=fail`,
          pending: `${backUrl}/?pago=pending`,
        },
        auto_return: "approved",
      };

      // 3) Intento 1: proxy de Vite (/mp/link). Si no lo tenés, cae al fallback.
      async function postJson(url) {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        let json = {};
        try { json = text ? JSON.parse(text) : {}; } catch {}
        if (!res.ok) {
          const msg = json?.error || json?.message || `HTTP ${res.status} - ${text}`;
          throw new Error(msg);
        }
        return json;
      }

      let data;
      try {
        data = await postJson("/mp/link");
      } catch {
        // 4) Fallback: pega directo al backend si definiste VITE_BACK_ORIGIN (solo FRONT)
        const BACK_ORIGIN = (import.meta.env.VITE_BACK_ORIGIN || "").replace(/\/$/, "");
        if (!BACK_ORIGIN) throw new Error("No se pudo generar el link (configurá /mp proxy o VITE_BACK_ORIGIN).");
        data = await postJson(`${BACK_ORIGIN}/mp/link`);
      }

      const payUrl =
        data?.init_point ||
        data?.sandbox_init_point ||
        data?.url ||
        data?.data?.init_point ||
        data?.data?.sandbox_init_point ||
        data?.data?.url;

      if (!payUrl) throw new Error("El backend no devolvió un link de pago válido.");

      // 5) Redirijo al flujo de pago
      window.location.href = payUrl;
    } catch (e) {
      console.error(e);
      alert(`No pudimos generar el link de pago: ${e.message || e}`);
    } finally {
      setGlobalLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <StampBackground base="#C8102E" stamp="#FFD300" opacity={0.25} size={48} rotate={-8} />
      <div className="relative z-10">
        {screen === "welcome" && (
          <WelcomeScreen onContinue={() => setScreen("menu")} />
        )}

        {screen === "menu" && (
          <MenuScreen
            onBack={() => setScreen("welcome")}
            setGlobalLoading={setGlobalLoading}
            onOpenHamburgers={(tipo) => { setSelectedType(tipo); setScreen("hamburgers"); }}
            onOpenBebidas={(tipo) => { setSelectedType(tipo); setScreen("bebidas"); }}
            onOpenExtras={(tipo) => { setSelectedType(tipo); setScreen("extras"); }}
          />
        )}

        {screen === "hamburgers" && (
          <HamburgersScreen selectedType={selectedType} onBack={() => setScreen("menu")} />
        )}
        {screen === "bebidas" && (
          <BebidasScreen selectedType={selectedType} onBack={() => setScreen("menu")} />
        )}
        {screen === "extras" && (
          <ExtrasScreen selectedType={selectedType} onBack={() => setScreen("menu")} />
        )}
        {screen === "checkout" && (
          // 🔴 UI intacta: solo conectamos onPay
          <CheckoutScreen
            onBack={() => setScreen("menu")}
             onPay={() => setScreen("pay")}  
          />
        )}
        {screen === "pay" && (
  <PayScreen
    onBack={() => setScreen("checkout")}
     onDone={() => setScreen("welcome")}   // 👈 volver a la pantalla inicial
    setGlobalLoading={setGlobalLoading}
  />
)}

      </div>

      {/* Botón y panel del carrito: conduce a 'checkout' */}
      <CartButton onClick={() => setCartOpen(true)} />
      <CartPanel
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onFinish={() => { setCartOpen(false); setScreen("checkout"); }}
      />

      <LoadingOverlay show={globalLoading} text="Cargando…" />
    </div>
  );
}
