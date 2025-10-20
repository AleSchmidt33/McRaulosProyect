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

export default function App() {
  const [screen, setScreen] = useState("welcome"); // 'welcome' | 'menu' | 'hamburgers' | 'bebidas' | 'extras' | 'checkout'
  const [selectedType, setSelectedType] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);

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
          <CheckoutScreen
            onBack={() => setScreen("menu")}
            onPay={() => {
              // Acá vas a integrar el pago real (por ejemplo /mp/link)
              console.log("Ir a pagar");
              // luego podés redirigir o abrir un link de pago
            }}
          />
        )}
      </div>

      {/* Botón y panel del carrito: ahora conduce a 'checkout' */}
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
