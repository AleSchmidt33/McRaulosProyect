import React, { useState } from 'react';

const WelcomeScreen = () => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('welcome');

  const handleContinue = () => {
    if (selectedOption) {
      // En tu proyecto local, descomenta estas líneas:
      // localStorage.setItem('orderType', selectedOption);
      // window.location.href = '/menuTipoProductos'; // o usa tu router
      
      // Para esta demo, cambiamos de pantalla localmente:
      setCurrentScreen('menuTipoProductos');
    }
  };

  // Pantalla de menú (placeholder)
  if (currentScreen === 'menuTipoProductos') {

  }

  // Pantalla de bienvenida
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg">
            <div className="w-full h-full bg-orange-400 flex items-center justify-center text-white font-bold text-lg">🍔</div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">McRaulos</h1>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="px-6 py-8">
        {/* Título de bienvenida */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            ¡Bienvenido!
          </h2>
          <p className="text-gray-600 text-lg">
            ¿Cómo prefieres disfrutar tu comida?
          </p>
        </div>

        {/* Opciones */}
        <div className="space-y-4 max-w-md mx-auto">
          {/* Opción Comer Acá */}
          <button 
            onClick={() => setSelectedOption('comer-aca')}
            className={`w-full bg-white border-2 rounded-xl p-6 transition-all duration-200 shadow-sm ${
              selectedOption === 'comer-aca' 
                ? 'border-orange-500 bg-orange-50 border-4' 
                : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🍽️</span>
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-800">Comer Acá</h3>
                <p className="text-sm text-gray-500">Disfruta en nuestro local</p>
              </div>
            </div>
          </button>

          {/* Opción Take Away */}
          <button 
            onClick={() => setSelectedOption('take-away')}
            className={`w-full bg-white border-2 rounded-xl p-6 transition-all duration-200 shadow-sm ${
              selectedOption === 'take-away' 
                ? 'border-green-500 bg-green-50 border-4' 
                : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🥡</span>
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-800">Take Away</h3>
                <p className="text-sm text-gray-500">Para llevar</p>
              </div>
            </div>
          </button>
        </div>

        {/* Botón continuar */}
        <div className="mt-12 max-w-md mx-auto">
          <button 
            onClick={handleContinue}
            disabled={!selectedOption}
            className={`w-full font-semibold py-4 rounded-xl transition-colors duration-200 shadow-lg ${
              selectedOption 
                ? 'bg-orange-500 text-white hover:bg-orange-600 cursor-pointer' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;