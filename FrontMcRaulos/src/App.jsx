import { useState } from "react";
import StampBackground from "./components/StampBackground.jsx";
import WelcomeScreen from "./components/WelcomeScreen.jsx";
import MenuScreen from "./components/MenuScreen.jsx";
import HamburgersScreen from "./components/HamburgersScreen.jsx";
import BebidasScreen from "./components/BebidasScreen.jsx";
import ExtrasScreen from "./components/ExtrasScreen.jsx"; // 👈 nuevo

export default function App() {
  const [screen, setScreen] = useState("welcome"); // 'welcome' | 'menu' | 'hamburgers' | 'bebidas' | 'extras'
  const [selectedType, setSelectedType] = useState(null);

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
      </div>
    </div>
  );
}
