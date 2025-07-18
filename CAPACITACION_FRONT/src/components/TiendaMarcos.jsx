import React from 'react';

const MARCOS = [
  { file: 'marco1.png', nombre: 'Marco Marrón' },
  { file: 'marco2.png', nombre: 'Marco Arcoíris' },
  { file: 'marco3.png', nombre: 'Marco Dorado' },
];

export default function TiendaMarcos({ onClose, onSelectMarco }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-10">
      <h2 className="text-3xl font-bold mb-8 text-[#f59e42] drop-shadow">Tienda de Marcos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {MARCOS.map((marco, idx) => (
          <div key={marco.file} className="flex flex-col items-center bg-white rounded-xl shadow-lg p-6 w-56">
            <button
              className="w-32 h-32 flex items-center justify-center mb-4 focus:outline-none hover:scale-105 transition"
              onClick={() => onSelectMarco(marco.file)}
              title={`Seleccionar ${marco.nombre}`}
            >
              <img
                src={`/marcos/${marco.file}`}
                alt={marco.nombre}
                className="w-full h-full object-contain"
              />
            </button>
            <div className="text-lg font-semibold text-gray-800 mb-2 text-center">{marco.nombre}</div>
            <span className="text-xs text-gray-500">Haz clic para probar</span>
          </div>
        ))}
      </div>
      <button
        onClick={onClose}
        className="mt-10 px-6 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
      >
        Volver
      </button>
    </div>
  );
} 