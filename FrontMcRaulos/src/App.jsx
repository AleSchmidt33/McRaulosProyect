// src/App.jsx
import React, { useState } from "react";
import StampBackground from "./components/StampBackground.jsx"; // <-- A) Import fondo
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
  // 'welcome' | 'menu' | 'hamburgers' | 'bebidas' | 'extras' | 'checkout' | 'pay'
  const [screen, setScreen] = useState("welcome");
  const [selectedType, setSelectedType] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);

  return (
    <div className="relative min-h-screen">
      <StampBackground /> {/* <-- B) Pintar fondo */}

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
          <CheckoutScreen
            onBack={() => setScreen("menu")}
            onPay={() => setScreen("pay")}
          />
        )}

        {screen === "pay" && (
          <PayScreen onBack={() => setScreen("checkout")} />
        )}
      </div>

      {/* Carrito flotante */}
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
