    import React, { useState } from 'react';
    
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Menú de Productos</h2>
          <p className="text-gray-600 mb-4">Tipo de pedido: <span className="font-semibold text-orange-500">{selectedOption}</span></p>
          <button 
            onClick={() => setCurrentScreen('welcome')}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
          >
            Volver
          </button>
        </div>
      </div>
    );