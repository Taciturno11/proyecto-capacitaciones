import React, { useState } from 'react';

const OPCIONES = [
  { label: '+10 puntos', color: '#34d399' },
  { label: '+20 puntos', color: '#60a5fa' },
  { label: '+30 puntos', color: '#fbbf24' },
  { label: '+40 puntos', color: '#f59e42' },
  { label: '+50 puntos', color: '#f472b6' },
  { label: '-10 puntos', color: '#f87171' },
  { label: '-20 puntos', color: '#ef4444' },
  { label: '-30 puntos', color: '#b91c1c' },
  { label: '-40 puntos', color: '#991b1b' },
  { label: '-50 puntos', color: '#7f1d1d' },
  { label: 'Intente de nuevo', color: '#a3a3a3' },
  { label: '+10 puntos', color: '#34d399' },
  { label: '+20 puntos', color: '#60a5fa' },
  { label: '+30 puntos', color: '#fbbf24' },
  { label: '+40 puntos', color: '#f59e42' },
  { label: '+50 puntos', color: '#f472b6' },
  { label: '-10 puntos', color: '#f87171' },
  { label: '-20 puntos', color: '#ef4444' },
  { label: 'Intente de nuevo', color: '#a3a3a3' },
  { label: 'Intente de nuevo', color: '#a3a3a3' },
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function RuletaPuntos({ onClose }) {
  const [girando, setGirando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [giro, setGiro] = useState(0);

  // Definir anguloPorOpcion global para el componente
  const anguloPorOpcion = 360 / OPCIONES.length;

  const girarRuleta = () => {
    setGirando(true);
    setResultado(null);
    // Elegir resultado
    const idx = getRandomInt(0, OPCIONES.length - 1);
    // Calcular ángulo final (ruleta da varias vueltas)
    const vueltas = getRandomInt(4, 7);
    const anguloFinal = vueltas * 360 + (360 - idx * anguloPorOpcion - anguloPorOpcion / 2);
    setGiro(anguloFinal);
    setTimeout(() => {
      setResultado(OPCIONES[idx]);
      setGirando(false);
    }, 2200);
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-10 relative">
      {/* Fondo radial llamativo */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at 50% 40%, #fffbe6 0%, #ffe5b4 40%, #f59e42 100%)',
        opacity: 0.7
      }} />
      <h2
        className="text-3xl font-bold mb-8 z-10"
        style={{
          color: '#f59e42',
          textShadow: '0 2px 8px #fff, 0 1px 2px #222',
        }}
      >
        ¡Gira la Ruleta de Puntos!
      </h2>
      <div className="flex flex-col items-center mb-8 z-10">
        <div className="relative w-[400px] h-[400px] flex items-center justify-center">
          {/* Ruleta animada con sombra y borde gris claro */}
          <div
            className="w-[400px] h-[400px] rounded-full shadow-2xl border-8 border-gray-200"
            style={{
              transition: girando ? 'transform 2s cubic-bezier(0.33,1,0.68,1)' : 'none',
              transform: `rotate(${giro}deg)`
            }}
          >
            <svg viewBox="0 0 400 400" className="w-[400px] h-[400px]">
              {OPCIONES.map((op, i) => {
                const startAngle = (i / OPCIONES.length) * 360;
                const endAngle = ((i + 1) / OPCIONES.length) * 360;
                const largeArc = endAngle - startAngle > 180 ? 1 : 0;
                const x1 = 200 + 180 * Math.cos((Math.PI * startAngle) / 180);
                const y1 = 200 + 180 * Math.sin((Math.PI * startAngle) / 180);
                const x2 = 200 + 180 * Math.cos((Math.PI * endAngle) / 180);
                const y2 = 200 + 180 * Math.sin((Math.PI * endAngle) / 180);
                return (
                  <g key={op.label + i}>
                    <path
                      d={`M200,200 L${x1},${y1} A180,180 0 ${largeArc} 1 ${x2},${y2} Z`}
                      fill={op.color}
                      opacity={0.85}
                    />
                    {/* Etiqueta */}
                    <text
                      x={200 + 125 * Math.cos(Math.PI * (startAngle + anguloPorOpcion / 2) / 180)}
                      y={200 + 125 * Math.sin(Math.PI * (startAngle + anguloPorOpcion / 2) / 180)}
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      fontSize="12"
                      fill="#fff"
                      stroke="#222"
                      strokeWidth="0.8"
                      paintOrder="stroke"
                      style={{ fontWeight: 700 }}
                      transform={`rotate(${startAngle + anguloPorOpcion / 2},${200 + 125 * Math.cos(Math.PI * (startAngle + anguloPorOpcion / 2) / 180)},${200 + 125 * Math.sin(Math.PI * (startAngle + anguloPorOpcion / 2) / 180)})`}
                    >
                      {op.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          {/* Flecha arriba */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
            <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: 'rotate(180deg)' }}>
              <polygon points="24,0 39,36 24,30 9,36" fill="#f59e42" />
            </svg>
          </div>
        </div>
        <button
          onClick={girarRuleta}
          disabled={girando}
          className="mt-8 px-10 py-4 rounded-full bg-blue-600 text-white font-bold text-2xl shadow-2xl hover:bg-blue-700 transition disabled:opacity-60 focus:ring-4 focus:ring-blue-400 focus:ring-opacity-50 animate-pulse border-4 border-white"
          style={{ boxShadow: '0 0 32px 8px #60a5fa, 0 2px 8px #2563eb' }}
        >
          {girando ? 'Girando...' : 'Girar'}
        </button>
        {resultado && (
          <div className="mt-8 text-2xl font-bold text-center" style={{ color: resultado.color }}>
            {resultado.label}
          </div>
        )}
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